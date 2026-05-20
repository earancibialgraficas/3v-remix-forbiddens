ALTER TABLE public.user_inventory
  DROP CONSTRAINT IF EXISTS user_inventory_user_id_item_slug_expires_at_key;

CREATE TABLE IF NOT EXISTS public.active_account_boosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  item_slug text NOT NULL,
  multiplier integer NOT NULL DEFAULT 3 CHECK (multiplier > 1),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_account_boosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active boosters own read" ON public.active_account_boosters;
CREATE POLICY "active boosters own read"
ON public.active_account_boosters
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION public.split_inventory_stack(p_stack_id uuid, p_quantity integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  stack record;
  qty integer := GREATEST(COALESCE(p_quantity, 0), 0);
  new_stack_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT *
  INTO stack
  FROM public.user_inventory
  WHERE id = p_stack_id AND user_id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'stack_not_found');
  END IF;

  IF qty <= 0 OR qty >= stack.quantity THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_quantity', 'available', stack.quantity);
  END IF;

  UPDATE public.user_inventory
  SET quantity = quantity - qty,
      updated_at = now()
  WHERE id = stack.id;

  INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
  VALUES (
    stack.user_id,
    stack.item_slug,
    stack.item_name,
    qty,
    stack.expires_at,
    COALESCE(stack.metadata, '{}'::jsonb) || jsonb_build_object('split_from', stack.id)
  )
  RETURNING id INTO new_stack_id;

  RETURN json_build_object('ok', true, 'stack_id', stack.id, 'new_stack_id', new_stack_id, 'split_quantity', qty);
END;
$$;

CREATE OR REPLACE FUNCTION public.use_inventory_booster(p_stack_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  stack record;
  active_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT *
  INTO stack
  FROM public.user_inventory
  WHERE id = p_stack_id
    AND user_id = uid
    AND item_slug = 'points_x3_week'
    AND quantity > 0
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'booster_not_available');
  END IF;

  UPDATE public.user_inventory
  SET quantity = quantity - 1,
      updated_at = now()
  WHERE id = stack.id;

  DELETE FROM public.user_inventory
  WHERE id = stack.id AND quantity <= 0;

  SELECT COALESCE(MAX(ends_at), now())
  INTO active_until
  FROM public.active_account_boosters
  WHERE user_id = uid
    AND item_slug = 'points_x3_week'
    AND ends_at > now();

  active_until := GREATEST(active_until, now()) + interval '7 days';

  INSERT INTO public.active_account_boosters (user_id, item_slug, multiplier, ends_at, metadata)
  VALUES (uid, 'points_x3_week', 3, active_until, jsonb_build_object('source_stack_id', p_stack_id));

  RETURN json_build_object('ok', true, 'used', 1, 'active_until', active_until);
END;
$$;

INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
SELECT DISTINCT
  user_id::text,
  'points_x3_week',
  'Potenciador x3 de puntos',
  5,
  now() + interval '7 days',
  jsonb_build_object('source', 'staff_gift', 'quantity', 5, 'granted_at', now())
FROM public.user_roles
WHERE role IN ('master_web'::public.app_role, 'admin'::public.app_role, 'moderator'::public.app_role);

REVOKE EXECUTE ON FUNCTION public.split_inventory_stack(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.use_inventory_booster(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.split_inventory_stack(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_inventory_booster(uuid) TO authenticated;

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
  );

  RETURN qty;
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
    VALUES (uid, 'points_x3_week', 'Potenciador x3 de puntos', offer.boosters, now() + interval '7 days', jsonb_build_object('source', 'trade'));
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
    VALUES (offer.sender_id, 'points_x3_week', 'Potenciador x3 de puntos', offer.boosters, now() + interval '7 days', jsonb_build_object('source', 'trade_cancel'));
  END IF;

  UPDATE public.inventory_trade_offers
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_offer_id;

  RETURN json_build_object('ok', true);
END;
$$;

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
  base_awarded integer := GREATEST(COALESCE(p_points, 25), 0);
  active_multiplier integer := 1;
  awarded integer := 0;
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

  IF base_awarded <= 0 THEN
    RETURN json_build_object('awarded', 0, 'reason', 'no_points');
  END IF;

  IF p_game_slug NOT IN (
    'pong', 'agar', 'tic-tac-toe', 'card-duel', 'chess', 'massive-decks', 'watch-together',
    'casino-roulette', 'casino-blackjack', 'casino-chess', 'casino-horses', 'casino-bingo'
  ) THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_game');
  END IF;

  SELECT COALESCE(MAX(multiplier), 1)
  INTO active_multiplier
  FROM public.active_account_boosters
  WHERE user_id = uid_text
    AND item_slug = 'points_x3_week'
    AND starts_at <= now()
    AND ends_at > now();

  awarded := base_awarded * GREATEST(COALESCE(active_multiplier, 1), 1);

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
    INSERT INTO public.leaderboard_scores (user_id, display_name, game_name, console_type, score, play_time_seconds)
    VALUES (uid_text, COALESCE(player_name, 'Anonimo'), display_game_name, 'multiplayer', leaderboard_score, 0)
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
    'base_awarded', base_awarded,
    'multiplier', GREATEST(COALESCE(active_multiplier, 1), 1),
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

GRANT EXECUTE ON FUNCTION public.grant_membership_boosters(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_inventory_trade_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_inventory_trade_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) TO authenticated;
