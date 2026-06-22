-- Cada cuenta puede tener solamente un potenciador x3 activo a la vez.
-- Las unidades restantes conservan su estado normal hasta que termine el activo.

-- Corrige cuentas que alcanzaron a activar varias unidades con la funcion anterior.
-- Conserva la primera activacion vigente y devuelve las posteriores al estado normal.
WITH ranked_active AS (
  SELECT
    id,
    metadata->>'source_stack_id' AS source_stack_id,
    row_number() OVER (
      PARTITION BY user_id, item_slug
      ORDER BY starts_at ASC, created_at ASC, id ASC
    ) AS active_position
  FROM public.active_account_boosters
  WHERE item_slug = 'points_x3_week'
    AND ends_at > now()
), extra_active AS (
  SELECT id, source_stack_id
  FROM ranked_active
  WHERE active_position > 1
)
UPDATE public.user_inventory AS inventory
SET metadata = COALESCE(inventory.metadata, '{}'::jsonb)
      - 'used_by_users'
      - 'active_until'
      - 'last_used_by'
      - 'last_used_at',
    expires_at = NULL,
    updated_at = now()
FROM extra_active
WHERE inventory.id::text = extra_active.source_stack_id;

WITH ranked_active AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, item_slug
      ORDER BY starts_at ASC, created_at ASC, id ASC
    ) AS active_position
  FROM public.active_account_boosters
  WHERE item_slug = 'points_x3_week'
    AND ends_at > now()
)
DELETE FROM public.active_account_boosters AS booster
USING ranked_active
WHERE booster.id = ranked_active.id
  AND ranked_active.active_position > 1;

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

  -- Serializa activaciones de una misma cuenta, incluso desde varias pestañas.
  PERFORM pg_advisory_xact_lock(hashtextextended(uid || ':points_x3_week', 0));

  SELECT *
  INTO stack
  FROM public.user_inventory
  WHERE id = p_stack_id
    AND user_id = uid
    AND item_slug = 'points_x3_week'
    AND quantity > 0
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'booster_not_available');
  END IF;

  -- No se acumulan ni se encadenan activaciones: debe finalizar la vigente.
  IF EXISTS (
    SELECT 1
    FROM public.active_account_boosters
    WHERE user_id = uid
      AND item_slug = 'points_x3_week'
      AND starts_at <= now()
      AND ends_at > now()
  ) THEN
    RETURN json_build_object('ok', false, 'reason', 'booster_still_active');
  END IF;

  used_by := COALESCE(stack.metadata->'used_by_users', '[]'::jsonb);
  IF used_by ? uid THEN
    RETURN json_build_object('ok', false, 'reason', 'already_used_by_this_user');
  END IF;

  active_until := now() + interval '7 days';
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
        expires_at = NULL,
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

  RETURN json_build_object(
    'ok', true,
    'used', 1,
    'active_until', active_until,
    'stack_id', active_stack_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.use_inventory_booster(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.use_inventory_booster(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.use_inventory_booster(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
