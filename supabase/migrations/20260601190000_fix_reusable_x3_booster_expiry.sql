-- Mantiene los boosters x3 reutilizables por trueque cuando ya vencio su uso activo.
-- El efecto real sigue dependiendo de active_account_boosters.ends_at.

UPDATE public.user_inventory
SET expires_at = NULL,
    updated_at = now()
WHERE item_slug = 'points_x3_week'
  AND metadata ? 'active_until'
  AND expires_at IS NOT NULL;

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
  stack_active_until timestamptz;
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
    AND (
      expires_at IS NULL
      OR expires_at > now()
      OR metadata ? 'active_until'
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'booster_not_available');
  END IF;

  used_by := COALESCE(stack.metadata->'used_by_users', '[]'::jsonb);
  IF used_by ? uid THEN
    RETURN json_build_object('ok', false, 'reason', 'already_used_by_this_user');
  END IF;

  stack_active_until := NULLIF(stack.metadata->>'active_until', '')::timestamptz;
  IF stack_active_until > now() THEN
    RETURN json_build_object('ok', false, 'reason', 'booster_still_active');
  END IF;

  SELECT COALESCE(MAX(ends_at), now())
  INTO active_until
  FROM public.active_account_boosters
  WHERE user_id = uid
    AND item_slug = 'points_x3_week'
    AND ends_at > now();

  active_until := GREATEST(active_until, now()) + interval '7 days';
  next_metadata := COALESCE(stack.metadata, '{}'::jsonb)
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
    VALUES (uid, stack.item_slug, stack.item_name, 1, NULL, next_metadata)
    RETURNING id INTO active_stack_id;
  ELSE
    UPDATE public.user_inventory
    SET expires_at = NULL,
        metadata = next_metadata,
        updated_at = now()
    WHERE id = stack.id
    RETURNING id INTO active_stack_id;
  END IF;

  INSERT INTO public.active_account_boosters (user_id, item_slug, multiplier, ends_at, metadata)
  VALUES (uid, 'points_x3_week', 3, active_until, jsonb_build_object('source_stack_id', active_stack_id));

  RETURN json_build_object('ok', true, 'used', 1, 'active_until', active_until, 'stack_id', active_stack_id);
END;
$$;

REVOKE ALL ON FUNCTION public.use_inventory_booster(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.use_inventory_booster(uuid) TO authenticated;
