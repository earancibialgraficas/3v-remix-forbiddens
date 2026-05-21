-- Limita las apuestas BET normales a 1.000 F-coin.
-- Bingo queda fuera porque maneja compra de cartones y premios con reglas propias.

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

  IF p_bet > 1000 AND COALESCE(p_game_slug, '') NOT IN ('casino-bingo', 'casino-bingo-card') THEN
    RETURN json_build_object('awarded', 0, 'reason', 'bet_limit_exceeded', 'max_bet', 1000);
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.settle_casino_wager(text, text, bigint, bigint, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.settle_casino_wager(text, text, bigint, bigint, jsonb) TO authenticated;
