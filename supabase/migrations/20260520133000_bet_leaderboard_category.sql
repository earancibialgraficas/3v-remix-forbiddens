-- Separa los juegos BET en su propio leaderboard persistente.

ALTER TABLE public.leaderboard_scores
  DROP CONSTRAINT IF EXISTS leaderboard_scores_console_type_check;

ALTER TABLE public.leaderboard_scores
  ADD CONSTRAINT leaderboard_scores_console_type_check
  CHECK (console_type IS NOT NULL AND btrim(console_type) <> '')
  NOT VALID;

CREATE OR REPLACE FUNCTION public.settle_casino_wager(
  p_game_slug text,
  p_room_code text,
  p_bet bigint,
  p_payout bigint,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  current_balance bigint;
  next_balance bigint;
  net_amount bigint;
  player_name text := 'Anonimo';
  display_game_name text;
  leaderboard_id text;
  leaderboard_score bigint := 0;
  leaderboard_delta bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'not_authenticated');
  END IF;

  p_bet := GREATEST(COALESCE(p_bet, 0), 0);
  p_payout := GREATEST(COALESCE(p_payout, 0), 0);
  current_balance := public.ensure_point_wallet(uid);

  IF current_balance < p_bet THEN
    RETURN json_build_object('awarded', 0, 'reason', 'insufficient_points', 'wallet_balance', current_balance);
  END IF;

  display_game_name := CASE p_game_slug
    WHEN 'casino-roulette' THEN 'Ruleta Retro'
    WHEN 'casino-blackjack' THEN 'Blackjack Drag'
    WHEN 'casino-chess' THEN 'Ajedrez con Apuesta'
    WHEN 'casino-horses' THEN 'Carrera de Caballos'
    WHEN 'casino-bingo' THEN 'Bingo Arcade'
    WHEN 'casino-bingo-card' THEN 'Bingo Arcade'
    ELSE COALESCE(NULLIF(p_game_slug, ''), 'Juego BET')
  END;

  next_balance := current_balance - p_bet + p_payout;
  net_amount := p_payout - p_bet;

  UPDATE public.point_wallets
  SET balance = next_balance, updated_at = now()
  WHERE user_id = uid;

  INSERT INTO public.casino_wagers (user_id, game_slug, room_code, bet, payout, net, meta)
  VALUES (uid, p_game_slug, COALESCE(p_room_code, ''), p_bet, p_payout, net_amount, COALESCE(p_meta, '{}'::jsonb));

  SELECT COALESCE(display_name, 'Anonimo')
  INTO player_name
  FROM public.profiles
  WHERE user_id::text = uid
  LIMIT 1;

  -- El leaderboard BET mide ganancia neta acumulada por juego. Las perdidas bajan el neto, sin dejarlo bajo cero.
  leaderboard_delta := net_amount;
  IF leaderboard_delta <> 0 AND p_game_slug <> 'casino-bingo-card' THEN
    SELECT id::text, score
    INTO leaderboard_id, leaderboard_score
    FROM public.leaderboard_scores
    WHERE user_id::text = uid
      AND game_name = display_game_name
      AND console_type = 'bet'
    ORDER BY score DESC, updated_at DESC
    LIMIT 1;

    IF leaderboard_id IS NULL THEN
      leaderboard_score := GREATEST(leaderboard_delta, 0);
      EXECUTE format(
        'INSERT INTO public.leaderboard_scores (user_id, display_name, game_name, console_type, score, play_time_seconds)
         VALUES (%L, %L, %L, %L, %s, 0)
         RETURNING id::text',
        uid,
        COALESCE(player_name, 'Anonimo'),
        display_game_name,
        'bet',
        leaderboard_score
      )
      INTO leaderboard_id;
    ELSE
      leaderboard_score := GREATEST(COALESCE(leaderboard_score, 0) + leaderboard_delta, 0);
      UPDATE public.leaderboard_scores
      SET score = leaderboard_score,
          display_name = COALESCE(player_name, display_name),
          updated_at = now()
      WHERE id::text = leaderboard_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'awarded', GREATEST(net_amount, 0),
    'reason', 'ok',
    'wallet_balance', next_balance,
    'net', net_amount,
    'leaderboard_score', COALESCE(leaderboard_score, 0),
    'leaderboard_console', 'bet'
  );
END;
$$;

WITH wager_totals AS (
  SELECT
    cw.user_id,
    CASE cw.game_slug
      WHEN 'casino-roulette' THEN 'Ruleta Retro'
      WHEN 'casino-blackjack' THEN 'Blackjack Drag'
      WHEN 'casino-chess' THEN 'Ajedrez con Apuesta'
      WHEN 'casino-horses' THEN 'Carrera de Caballos'
      WHEN 'casino-bingo' THEN 'Bingo Arcade'
      ELSE cw.game_slug
    END AS game_name,
    GREATEST(SUM(COALESCE(cw.net, 0)), 0)::integer AS score
  FROM public.casino_wagers cw
  WHERE cw.game_slug IN ('casino-roulette', 'casino-blackjack', 'casino-chess', 'casino-horses', 'casino-bingo')
  GROUP BY cw.user_id, cw.game_slug
),
named_totals AS (
  SELECT
    wt.user_id::uuid AS user_id,
    COALESCE(p.display_name, 'Anonimo') AS display_name,
    wt.game_name,
    wt.score
  FROM wager_totals wt
  LEFT JOIN public.profiles p ON p.user_id::text = wt.user_id
  WHERE wt.score > 0
)
INSERT INTO public.leaderboard_scores (user_id, display_name, game_name, console_type, score, play_time_seconds)
SELECT user_id, display_name, game_name, 'bet', score, 0
FROM named_totals
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leaderboard_scores ls
  WHERE ls.user_id = named_totals.user_id
    AND ls.game_name = named_totals.game_name
    AND ls.console_type = 'bet'
);

REVOKE EXECUTE ON FUNCTION public.settle_casino_wager(text, text, bigint, bigint, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.settle_casino_wager(text, text, bigint, bigint, jsonb) TO authenticated;
