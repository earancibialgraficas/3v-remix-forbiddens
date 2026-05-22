-- Permite comerciar cualquier item del inventario en trueques en vivo.
-- Los items se mueven desde el inventario al completar el trueque y se fusionan con stacks compatibles.

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
  target_stack_id uuid;
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

    UPDATE public.user_inventory
    SET quantity = quantity - qty,
        updated_at = now()
    WHERE id = stack.id;

    DELETE FROM public.user_inventory WHERE id = stack.id AND quantity <= 0;

    target_stack_id := NULL;
    SELECT id
    INTO target_stack_id
    FROM public.user_inventory
    WHERE user_id = trade.user_b
      AND item_slug = stack.item_slug
      AND expires_at IS NOT DISTINCT FROM stack.expires_at
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE;

    IF target_stack_id IS NULL THEN
      INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
      VALUES (trade.user_b, stack.item_slug, stack.item_name, qty, stack.expires_at, stack.metadata || jsonb_build_object('last_traded_at', now(), 'last_traded_from', trade.user_a));
    ELSE
      UPDATE public.user_inventory
      SET quantity = quantity + qty,
          item_name = stack.item_name,
          metadata = metadata || stack.metadata || jsonb_build_object('last_traded_at', now(), 'last_traded_from', trade.user_a),
          updated_at = now()
      WHERE id = target_stack_id;
    END IF;
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

    UPDATE public.user_inventory
    SET quantity = quantity - qty,
        updated_at = now()
    WHERE id = stack.id;

    DELETE FROM public.user_inventory WHERE id = stack.id AND quantity <= 0;

    target_stack_id := NULL;
    SELECT id
    INTO target_stack_id
    FROM public.user_inventory
    WHERE user_id = trade.user_a
      AND item_slug = stack.item_slug
      AND expires_at IS NOT DISTINCT FROM stack.expires_at
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE;

    IF target_stack_id IS NULL THEN
      INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
      VALUES (trade.user_a, stack.item_slug, stack.item_name, qty, stack.expires_at, stack.metadata || jsonb_build_object('last_traded_at', now(), 'last_traded_from', trade.user_b));
    ELSE
      UPDATE public.user_inventory
      SET quantity = quantity + qty,
          item_name = stack.item_name,
          metadata = metadata || stack.metadata || jsonb_build_object('last_traded_at', now(), 'last_traded_from', trade.user_b),
          updated_at = now()
      WHERE id = target_stack_id;
    END IF;
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

REVOKE EXECUTE ON FUNCTION public.complete_live_inventory_trade(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.complete_live_inventory_trade(uuid) TO authenticated;
