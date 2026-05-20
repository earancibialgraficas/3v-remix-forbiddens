-- Mesa de trueque en vivo y boosters reutilizables por comercio con historial por usuario.

CREATE TABLE IF NOT EXISTS public.inventory_live_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_key text NOT NULL UNIQUE,
  user_a text NOT NULL,
  user_b text NOT NULL,
  user_a_points bigint NOT NULL DEFAULT 0 CHECK (user_a_points >= 0),
  user_b_points bigint NOT NULL DEFAULT 0 CHECK (user_b_points >= 0),
  user_a_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_b_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_a_ready boolean NOT NULL DEFAULT false,
  user_b_ready boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_live_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live trades own read" ON public.inventory_live_trades;
CREATE POLICY "live trades own read"
ON public.inventory_live_trades
FOR SELECT
USING (auth.uid()::text IN (user_a, user_b));

CREATE OR REPLACE FUNCTION public.upsert_live_inventory_trade(
  p_other_user_id text,
  p_points bigint DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_ready boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  user_a_value text;
  user_b_value text;
  pair text;
  trade record;
  safe_points bigint := GREATEST(COALESCE(p_points, 0), 0);
  safe_items jsonb := COALESCE(p_items, '[]'::jsonb);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = uid THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_partner');
  END IF;

  IF uid < p_other_user_id THEN
    user_a_value := uid;
    user_b_value := p_other_user_id;
  ELSE
    user_a_value := p_other_user_id;
    user_b_value := uid;
  END IF;

  pair := user_a_value || ':' || user_b_value;

  INSERT INTO public.inventory_live_trades (pair_key, user_a, user_b)
  VALUES (pair, user_a_value, user_b_value)
  ON CONFLICT (pair_key) DO UPDATE
    SET status = CASE WHEN public.inventory_live_trades.status = 'completed' THEN 'pending' ELSE public.inventory_live_trades.status END,
        updated_at = now();

  SELECT *
  INTO trade
  FROM public.inventory_live_trades
  WHERE pair_key = pair
  FOR UPDATE;

  IF trade.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'reason', 'trade_not_pending');
  END IF;

  IF uid = trade.user_a THEN
    UPDATE public.inventory_live_trades
    SET user_a_points = safe_points,
        user_a_items = safe_items,
        user_a_ready = COALESCE(p_ready, false),
        user_b_ready = CASE
          WHEN user_a_points IS DISTINCT FROM safe_points OR user_a_items IS DISTINCT FROM safe_items THEN false
          ELSE user_b_ready
        END,
        updated_at = now()
    WHERE id = trade.id
    RETURNING * INTO trade;
  ELSE
    UPDATE public.inventory_live_trades
    SET user_b_points = safe_points,
        user_b_items = safe_items,
        user_b_ready = COALESCE(p_ready, false),
        user_a_ready = CASE
          WHEN user_b_points IS DISTINCT FROM safe_points OR user_b_items IS DISTINCT FROM safe_items THEN false
          ELSE user_a_ready
        END,
        updated_at = now()
    WHERE id = trade.id
    RETURNING * INTO trade;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'trade_id', trade.id,
    'user_a', trade.user_a,
    'user_b', trade.user_b,
    'user_a_ready', trade.user_a_ready,
    'user_b_ready', trade.user_b_ready
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_live_inventory_trade(p_trade_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  trade record;
  item jsonb;
  stack record;
  qty integer;
  a_wallet bigint;
  b_wallet bigint;
  next_a_wallet bigint;
  next_b_wallet bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT *
  INTO trade
  FROM public.inventory_live_trades
  WHERE id = p_trade_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'trade_not_found');
  END IF;

  IF uid NOT IN (trade.user_a, trade.user_b) THEN
    RETURN json_build_object('ok', false, 'reason', 'not_participant');
  END IF;

  IF trade.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'reason', 'trade_not_pending');
  END IF;

  IF NOT trade.user_a_ready OR NOT trade.user_b_ready THEN
    RETURN json_build_object('ok', false, 'reason', 'both_users_must_be_ready');
  END IF;

  PERFORM public.ensure_point_wallet(trade.user_a);
  PERFORM public.ensure_point_wallet(trade.user_b);

  SELECT balance INTO a_wallet FROM public.point_wallets WHERE user_id = trade.user_a FOR UPDATE;
  SELECT balance INTO b_wallet FROM public.point_wallets WHERE user_id = trade.user_b FOR UPDATE;

  IF COALESCE(a_wallet, 0) < trade.user_a_points THEN
    RETURN json_build_object('ok', false, 'reason', 'user_a_insufficient_fcoins');
  END IF;

  IF COALESCE(b_wallet, 0) < trade.user_b_points THEN
    RETURN json_build_object('ok', false, 'reason', 'user_b_insufficient_fcoins');
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(trade.user_a_items)
  LOOP
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 0), 0);
    IF qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT *
    INTO stack
    FROM public.user_inventory
    WHERE id = (item->>'id')::uuid
      AND user_id = trade.user_a
      AND quantity >= qty
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'reason', 'user_a_item_missing');
    END IF;

    IF (stack.metadata->>'active_until')::timestamptz > now() THEN
      RETURN json_build_object('ok', false, 'reason', 'item_still_active');
    END IF;

    UPDATE public.user_inventory
    SET quantity = quantity - qty,
        updated_at = now()
    WHERE id = stack.id;

    DELETE FROM public.user_inventory WHERE id = stack.id AND quantity <= 0;

    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
    VALUES (trade.user_b, stack.item_slug, stack.item_name, qty, stack.expires_at, stack.metadata || jsonb_build_object('last_traded_at', now(), 'last_traded_from', trade.user_a));
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(trade.user_b_items)
  LOOP
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 0), 0);
    IF qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT *
    INTO stack
    FROM public.user_inventory
    WHERE id = (item->>'id')::uuid
      AND user_id = trade.user_b
      AND quantity >= qty
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'reason', 'user_b_item_missing');
    END IF;

    IF (stack.metadata->>'active_until')::timestamptz > now() THEN
      RETURN json_build_object('ok', false, 'reason', 'item_still_active');
    END IF;

    UPDATE public.user_inventory
    SET quantity = quantity - qty,
        updated_at = now()
    WHERE id = stack.id;

    DELETE FROM public.user_inventory WHERE id = stack.id AND quantity <= 0;

    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
    VALUES (trade.user_a, stack.item_slug, stack.item_name, qty, stack.expires_at, stack.metadata || jsonb_build_object('last_traded_at', now(), 'last_traded_from', trade.user_b));
  END LOOP;

  UPDATE public.point_wallets
  SET balance = balance - trade.user_a_points + trade.user_b_points,
      updated_at = now()
  WHERE user_id = trade.user_a
  RETURNING balance INTO next_a_wallet;

  UPDATE public.point_wallets
  SET balance = balance - trade.user_b_points + trade.user_a_points,
      updated_at = now()
  WHERE user_id = trade.user_b
  RETURNING balance INTO next_b_wallet;

  UPDATE public.inventory_live_trades
  SET status = 'completed',
      user_a_ready = false,
      user_b_ready = false,
      updated_at = now()
  WHERE id = trade.id;

  RETURN json_build_object('ok', true, 'trade_id', trade.id, 'user_a_wallet', next_a_wallet, 'user_b_wallet', next_b_wallet);
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
  used_by jsonb;
  next_metadata jsonb;
  active_stack_id uuid;
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

  used_by := COALESCE(stack.metadata->'used_by_users', '[]'::jsonb);
  IF used_by ? uid THEN
    RETURN json_build_object('ok', false, 'reason', 'already_used_by_this_user');
  END IF;

  IF (stack.metadata->>'active_until')::timestamptz > now() THEN
    RETURN json_build_object('ok', false, 'reason', 'booster_still_active');
  END IF;

  SELECT COALESCE(MAX(ends_at), now())
  INTO active_until
  FROM public.active_account_boosters
  WHERE user_id = uid
    AND item_slug = 'points_x3_week'
    AND ends_at > now();

  active_until := GREATEST(active_until, now()) + interval '7 days';
  next_metadata := stack.metadata
    || jsonb_build_object(
      'used_by_users', used_by || to_jsonb(uid),
      'active_until', active_until,
      'last_used_by', uid,
      'last_used_at', now()
    );

  IF stack.quantity > 1 THEN
    UPDATE public.user_inventory
    SET quantity = quantity - 1,
        updated_at = now()
    WHERE id = stack.id;

    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
    VALUES (uid, stack.item_slug, stack.item_name, 1, stack.expires_at, next_metadata)
    RETURNING id INTO active_stack_id;
  ELSE
    UPDATE public.user_inventory
    SET metadata = next_metadata,
        updated_at = now()
    WHERE id = stack.id
    RETURNING id INTO active_stack_id;
  END IF;

  INSERT INTO public.active_account_boosters (user_id, item_slug, multiplier, ends_at, metadata)
  VALUES (uid, 'points_x3_week', 3, active_until, jsonb_build_object('source_stack_id', active_stack_id));

  RETURN json_build_object('ok', true, 'used', 1, 'active_until', active_until, 'stack_id', active_stack_id);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_live_inventory_trade(text, bigint, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_live_inventory_trade(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.use_inventory_booster(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_live_inventory_trade(text, bigint, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_live_inventory_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_inventory_booster(uuid) TO authenticated;
