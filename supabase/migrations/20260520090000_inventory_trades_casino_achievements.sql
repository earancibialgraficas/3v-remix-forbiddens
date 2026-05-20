-- Inventario, trueques, apuestas con puntos comerciables y logros.
-- Migracion aditiva: no elimina datos existentes.

CREATE TABLE IF NOT EXISTS public.point_wallets (
  user_id text PRIMARY KEY,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  item_slug text NOT NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_slug, expires_at)
);

CREATE TABLE IF NOT EXISTS public.inventory_trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  points bigint NOT NULL DEFAULT 0 CHECK (points >= 0),
  boosters integer NOT NULL DEFAULT 0 CHECK (boosters >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.casino_wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  game_slug text NOT NULL,
  room_code text NOT NULL,
  bet bigint NOT NULL DEFAULT 0 CHECK (bet >= 0),
  payout bigint NOT NULL DEFAULT 0 CHECK (payout >= 0),
  net bigint NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('score', 'secret')),
  threshold bigint,
  secret_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id text NOT NULL,
  achievement_id text NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.point_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casino_wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet own read" ON public.point_wallets;
CREATE POLICY "wallet own read" ON public.point_wallets FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "inventory own read" ON public.user_inventory;
CREATE POLICY "inventory own read" ON public.user_inventory FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "trades own read" ON public.inventory_trade_offers;
CREATE POLICY "trades own read" ON public.inventory_trade_offers FOR SELECT USING (auth.uid()::text IN (sender_id, receiver_id));

DROP POLICY IF EXISTS "casino own read" ON public.casino_wagers;
CREATE POLICY "casino own read" ON public.casino_wagers FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "achievements public read" ON public.achievement_definitions;
CREATE POLICY "achievements public read" ON public.achievement_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "user achievements own read" ON public.user_achievements;
CREATE POLICY "user achievements own read" ON public.user_achievements FOR SELECT USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION public.ensure_point_wallet(p_user_id text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance bigint;
BEGIN
  INSERT INTO public.point_wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance
  FROM public.point_wallets
  WHERE user_id = p_user_id;

  RETURN COALESCE(current_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_stat_points_to_fcoins(p_points bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid_uuid uuid := auth.uid();
  uid text := auth.uid()::text;
  amount bigint := GREATEST(COALESCE(p_points, 0), 0);
  current_stat bigint;
  next_stat bigint;
  next_wallet bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF amount <= 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  SELECT COALESCE(total_score, 0)
  INTO current_stat
  FROM public.profiles
  WHERE user_id::text = uid
  FOR UPDATE;

  IF COALESCE(current_stat, 0) < amount THEN
    RETURN json_build_object('ok', false, 'reason', 'insufficient_stat_points', 'stat_points', COALESCE(current_stat, 0));
  END IF;

  PERFORM public.ensure_point_wallet(uid);

  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid_uuid, uid_uuid, 'stat_to_fcoin', gen_random_uuid(), -amount);

  UPDATE public.profiles
  SET total_score = COALESCE(total_score, 0) - amount,
      updated_at = now()
  WHERE user_id::text = uid
  RETURNING total_score INTO next_stat;

  UPDATE public.point_wallets
  SET balance = balance + amount,
      updated_at = now()
  WHERE user_id = uid
  RETURNING balance INTO next_wallet;

  RETURN json_build_object(
    'ok', true,
    'converted', amount,
    'stat_points', COALESCE(next_stat, 0),
    'wallet_balance', COALESCE(next_wallet, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_fcoins_to_stat_points(p_points bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid_uuid uuid := auth.uid();
  uid text := auth.uid()::text;
  amount bigint := GREATEST(COALESCE(p_points, 0), 0);
  current_wallet bigint;
  next_wallet bigint;
  next_stat bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF amount <= 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  current_wallet := public.ensure_point_wallet(uid);
  IF COALESCE(current_wallet, 0) < amount THEN
    RETURN json_build_object('ok', false, 'reason', 'insufficient_fcoins', 'wallet_balance', COALESCE(current_wallet, 0));
  END IF;

  UPDATE public.point_wallets
  SET balance = balance - amount,
      updated_at = now()
  WHERE user_id = uid
  RETURNING balance INTO next_wallet;

  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid_uuid, uid_uuid, 'fcoin_to_stat', gen_random_uuid(), amount);

  UPDATE public.profiles
  SET total_score = COALESCE(total_score, 0) + amount,
      updated_at = now()
  WHERE user_id::text = uid
  RETURNING total_score INTO next_stat;

  RETURN json_build_object(
    'ok', true,
    'converted', amount,
    'stat_points', COALESCE(next_stat, 0),
    'wallet_balance', COALESCE(next_wallet, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_membership_boosters(p_user_id text, p_tier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qty integer := CASE lower(COALESCE(p_tier, 'novato'))
    WHEN 'lite' THEN 1
    WHEN 'entusiasta' THEN 3
    WHEN 'coleccionista' THEN 5
    WHEN 'miembro del legado' THEN 7
    WHEN 'leyenda arcade' THEN 9
    WHEN 'creador de contenido' THEN 10
    ELSE 0
  END;
BEGIN
  IF qty <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
  VALUES (
    p_user_id,
    'points_x3_week',
    'Potenciador x3 de puntos',
    qty,
    now() + interval '7 days',
    jsonb_build_object('multiplier', 3, 'duration_days', 7, 'source', 'membership', 'tier', p_tier)
  )
  ON CONFLICT (user_id, item_slug, expires_at)
  DO UPDATE SET quantity = public.user_inventory.quantity + EXCLUDED.quantity,
                updated_at = now();

  RETURN qty;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_membership_boosters_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.membership_tier, '') IS DISTINCT FROM COALESCE(NEW.membership_tier, '') THEN
    PERFORM public.grant_membership_boosters(NEW.user_id::text, NEW.membership_tier);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_membership_boosters_on_tier_change ON public.profiles;
CREATE TRIGGER grant_membership_boosters_on_tier_change
AFTER UPDATE OF membership_tier ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_membership_boosters_trigger();

CREATE OR REPLACE FUNCTION public.create_inventory_trade_offer(
  p_receiver_id text,
  p_points bigint DEFAULT 0,
  p_boosters integer DEFAULT 0,
  p_note text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  offer_id uuid;
  wallet_balance bigint;
  owned_boosters integer;
  remaining_boosters integer;
  stack record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;
  IF p_receiver_id IS NULL OR p_receiver_id = uid THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_receiver');
  END IF;

  p_points := GREATEST(COALESCE(p_points, 0), 0);
  p_boosters := GREATEST(COALESCE(p_boosters, 0), 0);
  IF p_points = 0 AND p_boosters = 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'empty_offer');
  END IF;

  wallet_balance := public.ensure_point_wallet(uid);
  IF wallet_balance < p_points THEN
    RETURN json_build_object('ok', false, 'reason', 'insufficient_points');
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO owned_boosters
  FROM public.user_inventory
  WHERE user_id = uid AND item_slug = 'points_x3_week' AND (expires_at IS NULL OR expires_at > now());

  IF owned_boosters < p_boosters THEN
    RETURN json_build_object('ok', false, 'reason', 'insufficient_boosters');
  END IF;

  UPDATE public.point_wallets
  SET balance = balance - p_points, updated_at = now()
  WHERE user_id = uid;

  IF p_boosters > 0 THEN
    remaining_boosters := p_boosters;
    FOR stack IN
      SELECT id, quantity
      FROM public.user_inventory
      WHERE user_id = uid AND item_slug = 'points_x3_week' AND quantity > 0 AND (expires_at IS NULL OR expires_at > now())
      ORDER BY expires_at NULLS LAST, created_at
      FOR UPDATE
    LOOP
      EXIT WHEN remaining_boosters <= 0;
      UPDATE public.user_inventory
      SET quantity = quantity - LEAST(quantity, remaining_boosters),
          updated_at = now()
      WHERE id = stack.id;
      remaining_boosters := remaining_boosters - LEAST(stack.quantity, remaining_boosters);
    END LOOP;
  END IF;

  INSERT INTO public.inventory_trade_offers (sender_id, receiver_id, points, boosters, note)
  VALUES (uid, p_receiver_id, p_points, p_boosters, p_note)
  RETURNING id INTO offer_id;

  RETURN json_build_object('ok', true, 'offer_id', offer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_inventory_trade_offer(p_offer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  offer record;
BEGIN
  SELECT * INTO offer FROM public.inventory_trade_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR offer.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'reason', 'offer_unavailable');
  END IF;
  IF offer.receiver_id <> uid THEN
    RETURN json_build_object('ok', false, 'reason', 'not_receiver');
  END IF;

  PERFORM public.ensure_point_wallet(uid);
  UPDATE public.point_wallets
  SET balance = balance + offer.points, updated_at = now()
  WHERE user_id = uid;

  IF offer.boosters > 0 THEN
    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
    VALUES (uid, 'points_x3_week', 'Potenciador x3 de puntos', offer.boosters, now() + interval '7 days', jsonb_build_object('source', 'trade'))
    ON CONFLICT (user_id, item_slug, expires_at)
    DO UPDATE SET quantity = public.user_inventory.quantity + EXCLUDED.quantity,
                  updated_at = now();
  END IF;

  UPDATE public.inventory_trade_offers
  SET status = 'accepted', updated_at = now()
  WHERE id = p_offer_id;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_inventory_trade_offer(p_offer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  offer record;
BEGIN
  SELECT * INTO offer FROM public.inventory_trade_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR offer.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'reason', 'offer_unavailable');
  END IF;
  IF uid NOT IN (offer.sender_id, offer.receiver_id) THEN
    RETURN json_build_object('ok', false, 'reason', 'not_participant');
  END IF;

  PERFORM public.ensure_point_wallet(offer.sender_id);
  UPDATE public.point_wallets
  SET balance = balance + offer.points, updated_at = now()
  WHERE user_id = offer.sender_id;

  IF offer.boosters > 0 THEN
    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
    VALUES (offer.sender_id, 'points_x3_week', 'Potenciador x3 de puntos', offer.boosters, now() + interval '7 days', jsonb_build_object('source', 'trade_cancel'))
    ON CONFLICT (user_id, item_slug, expires_at)
    DO UPDATE SET quantity = public.user_inventory.quantity + EXCLUDED.quantity,
                  updated_at = now();
  END IF;

  UPDATE public.inventory_trade_offers
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_offer_id;

  RETURN json_build_object('ok', true);
END;
$$;

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

  next_balance := current_balance - p_bet + p_payout;
  net_amount := p_payout - p_bet;

  UPDATE public.point_wallets
  SET balance = next_balance, updated_at = now()
  WHERE user_id = uid;

  INSERT INTO public.casino_wagers (user_id, game_slug, room_code, bet, payout, net, meta)
  VALUES (uid, p_game_slug, COALESCE(p_room_code, ''), p_bet, p_payout, net_amount, COALESCE(p_meta, '{}'::jsonb));

  RETURN json_build_object(
    'awarded', GREATEST(net_amount, 0),
    'reason', 'ok',
    'wallet_balance', next_balance,
    'net', net_amount
  );
END;
$$;

DROP TRIGGER IF EXISTS credit_wallet_after_point_event ON public.point_events;
DROP FUNCTION IF EXISTS public.credit_wallet_from_point_event();

INSERT INTO public.achievement_definitions (id, name, description, kind, threshold, secret_hint) VALUES
  ('score_15k', 'Primer Tesoro', 'Alcanza 15.000 puntos.', 'score', 15000, NULL),
  ('score_25k', 'Ficha de Bronce', 'Alcanza 25.000 puntos.', 'score', 25000, NULL),
  ('score_50k', 'Racha Arcade', 'Alcanza 50.000 puntos.', 'score', 50000, NULL),
  ('score_75k', 'Control Caliente', 'Alcanza 75.000 puntos.', 'score', 75000, NULL),
  ('score_100k', 'Club 100K', 'Alcanza 100.000 puntos.', 'score', 100000, NULL),
  ('score_150k', 'Moneda Dorada', 'Alcanza 150.000 puntos.', 'score', 150000, NULL),
  ('score_250k', 'Campeon de Sala', 'Alcanza 250.000 puntos.', 'score', 250000, NULL),
  ('score_500k', 'Leyenda de Neon', 'Alcanza 500.000 puntos.', 'score', 500000, NULL),
  ('score_750k', 'Rey del Marcador', 'Alcanza 750.000 puntos.', 'score', 750000, NULL),
  ('score_1kk', '1KK Prohibido', 'Alcanza 1.000.000 de puntos.', 'score', 1000000, NULL),
  ('secret_midnight', 'Turno Fantasma', 'Juega una sala entre medianoche y las 03:00.', 'secret', NULL, 'La noche abre puertas.'),
  ('secret_first_trade', 'Primer Trueque', 'Completa tu primer intercambio de inventario.', 'secret', NULL, 'No todo se gana jugando.'),
  ('secret_blackjack_21', 'Veintiuno Exacto', 'Gana una mesa de Blackjack con 21.', 'secret', NULL, 'La mano perfecta existe.'),
  ('secret_roulette_zero', 'El Cero Te Mira', 'Acierta el cero en la ruleta.', 'secret', NULL, 'Apuesta donde nadie quiere mirar.'),
  ('secret_bingo_line', 'Linea Relampago', 'Canta una linea de Bingo antes del quinto turno.', 'secret', NULL, 'Rapido, preciso, ruidoso.'),
  ('secret_horse_longshot', 'Caballo Imposible', 'Gana una carrera con el caballo menos elegido.', 'secret', NULL, 'A veces conviene confiar en el raro.'),
  ('secret_chess_sacrifice', 'Sacrificio Real', 'Gana una partida de Ajedrez despues de perder la dama.', 'secret', NULL, 'Perder una pieza no es perder la partida.'),
  ('secret_inventory_stack', 'Stack Completo', 'Junta 10 potenciadores en el inventario.', 'secret', NULL, 'Una pila bonita siempre tienta.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  kind = EXCLUDED.kind,
  threshold = EXCLUDED.threshold,
  secret_hint = EXCLUDED.secret_hint;

REVOKE EXECUTE ON FUNCTION public.ensure_point_wallet(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.grant_membership_boosters(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.convert_stat_points_to_fcoins(bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.convert_fcoins_to_stat_points(bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_inventory_trade_offer(text, bigint, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_inventory_trade_offer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_inventory_trade_offer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.settle_casino_wager(text, text, bigint, bigint, jsonb) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.convert_stat_points_to_fcoins(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_fcoins_to_stat_points(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_inventory_trade_offer(text, bigint, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_inventory_trade_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_inventory_trade_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_casino_wager(text, text, bigint, bigint, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_multiplayer_win(
  p_game_slug text,
  p_room_code text,
  p_points integer DEFAULT 25
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uid_text text := auth.uid()::text;
  awarded integer := GREATEST(COALESCE(p_points, 25), 0);
  profile_total bigint := 0;
  player_name text := 'Anonimo';
  leaderboard_id text;
  leaderboard_score bigint := 0;
  display_game_name text;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'not_authenticated');
  END IF;

  IF p_game_slug IS NULL OR btrim(p_game_slug) = '' THEN
    RETURN json_build_object('awarded', 0, 'reason', 'missing_game');
  END IF;

  IF awarded <= 0 THEN
    RETURN json_build_object('awarded', 0, 'reason', 'no_points');
  END IF;

  IF p_game_slug NOT IN (
    'pong', 'agar', 'tic-tac-toe', 'card-duel', 'chess', 'massive-decks', 'watch-together',
    'casino-roulette', 'casino-blackjack', 'casino-chess', 'casino-horses', 'casino-bingo'
  ) THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_game');
  END IF;

  display_game_name := CASE p_game_slug
    WHEN 'pong' THEN 'Pong / Air Hockey'
    WHEN 'agar' THEN 'Agar.io Clon'
    WHEN 'tic-tac-toe' THEN 'Tic Tac Toe'
    WHEN 'card-duel' THEN 'Card Duel'
    WHEN 'chess' THEN 'Ajedrez Arcade'
    WHEN 'massive-decks' THEN 'Massive Decks'
    WHEN 'watch-together' THEN 'Watch Together'
    WHEN 'casino-roulette' THEN 'Ruleta Retro'
    WHEN 'casino-blackjack' THEN 'Blackjack Drag'
    WHEN 'casino-chess' THEN 'Ajedrez con Apuesta'
    WHEN 'casino-horses' THEN 'Carrera de Caballos'
    WHEN 'casino-bingo' THEN 'Bingo Arcade'
    ELSE p_game_slug
  END;

  SELECT COALESCE(display_name, 'Anonimo')
  INTO player_name
  FROM public.profiles
  WHERE user_id::text = uid_text
  LIMIT 1;

  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid, uid, 'multiplayer_win', gen_random_uuid(), awarded);

  SELECT id, score
  INTO leaderboard_id, leaderboard_score
  FROM public.leaderboard_scores
  WHERE user_id::text = uid_text
    AND game_name = display_game_name
    AND console_type = 'multiplayer'
  ORDER BY score DESC, updated_at DESC
  LIMIT 1;

  IF leaderboard_id IS NULL THEN
    leaderboard_score := awarded;
    INSERT INTO public.leaderboard_scores (
      user_id,
      display_name,
      game_name,
      console_type,
      score,
      play_time_seconds
    ) VALUES (
      uid_text,
      COALESCE(player_name, 'Anonimo'),
      display_game_name,
      'multiplayer',
      leaderboard_score,
      0
    )
    RETURNING id INTO leaderboard_id;
  ELSE
    leaderboard_score := COALESCE(leaderboard_score, 0) + awarded;
    UPDATE public.leaderboard_scores
    SET score = leaderboard_score,
        display_name = COALESCE(player_name, display_name),
        updated_at = now()
    WHERE id::text = leaderboard_id;
  END IF;

  UPDATE public.profiles
  SET total_score = COALESCE(total_score, 0) + awarded,
      updated_at = now()
  WHERE user_id::text = uid_text
  RETURNING total_score INTO profile_total;

  RETURN json_build_object(
    'awarded', awarded,
    'reason', 'ok',
    'game', p_game_slug,
    'game_name', display_game_name,
    'room', p_room_code,
    'leaderboard_score', COALESCE(leaderboard_score, 0),
    'total_score', COALESCE(profile_total, 0)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'awarded', 0,
    'reason', 'sql_error',
    'message', SQLERRM,
    'detail', SQLSTATE,
    'game', p_game_slug,
    'room', p_room_code
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) TO authenticated;
