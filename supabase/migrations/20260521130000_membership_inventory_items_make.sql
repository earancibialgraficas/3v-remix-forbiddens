-- Membresias como items comerciables del inventario.
-- Flujo:
-- 1) Make.com confirma MercadoPago y llama grant_membership_item_from_payment con service_role.
-- 2) El usuario usa el item desde inventario para activar 30 dias de membresia.

CREATE TABLE IF NOT EXISTS public.membership_payment_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  tier text NOT NULL,
  payment_id text NOT NULL,
  amount numeric,
  item_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id)
);

CREATE TABLE IF NOT EXISTS public.membership_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  tier text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'CLP',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'preference_created', 'granted', 'cancelled', 'failed')),
  preference_id text,
  init_point text,
  payment_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_payment_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership grants own read" ON public.membership_payment_grants;
CREATE POLICY "membership grants own read"
ON public.membership_payment_grants
FOR SELECT
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "membership checkout own read" ON public.membership_checkout_sessions;
CREATE POLICY "membership checkout own read"
ON public.membership_checkout_sessions
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION public.normalize_membership_tier(p_tier text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  tier text := lower(btrim(COALESCE(p_tier, '')));
BEGIN
  tier := translate(tier, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU');
  tier := regexp_replace(tier, '\s+', ' ', 'g');

  IF tier IN ('lite', 'entusiasta', 'coleccionista', 'leyenda arcade', 'miembro del legado', 'creador de contenido') THEN
    RETURN tier;
  END IF;

  IF tier IN ('leyenda', 'leyenda-arcade', 'leyenda_arcade') THEN
    RETURN 'leyenda arcade';
  END IF;

  IF tier IN ('legado', 'miembro-legado', 'miembro_del_legado') THEN
    RETURN 'miembro del legado';
  END IF;

  IF tier IN ('creador', 'creador-contenido', 'creador_de_contenido') THEN
    RETURN 'creador de contenido';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.membership_tier_label(p_tier text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE public.normalize_membership_tier(p_tier)
    WHEN 'lite' THEN 'Lite'
    WHEN 'entusiasta' THEN 'Entusiasta'
    WHEN 'coleccionista' THEN 'Coleccionista'
    WHEN 'leyenda arcade' THEN 'Leyenda Arcade'
    WHEN 'miembro del legado' THEN 'Miembro del Legado'
    WHEN 'creador de contenido' THEN 'Creador de Contenido'
    ELSE 'Membresia'
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_membership_checkout_session(
  p_tier text,
  p_amount numeric,
  p_currency text DEFAULT 'CLP'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  clean_tier text := public.normalize_membership_tier(p_tier);
  checkout_id uuid;
  clean_currency text := upper(btrim(COALESCE(p_currency, 'CLP')));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF clean_tier IS NULL OR clean_tier = 'novato' THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_tier');
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  INSERT INTO public.membership_checkout_sessions (user_id, tier, amount, currency, payload)
  VALUES (
    uid,
    clean_tier,
    p_amount,
    clean_currency,
    jsonb_build_object('created_from', 'memberships_page')
  )
  RETURNING id INTO checkout_id;

  RETURN json_build_object(
    'ok', true,
    'checkout_id', checkout_id,
    'external_reference', checkout_id::text,
    'user_id', uid,
    'tier', clean_tier,
    'tier_label', public.membership_tier_label(clean_tier),
    'amount', p_amount,
    'currency', clean_currency
  );
END;
$$;

DROP FUNCTION IF EXISTS public.grant_membership_item_from_payment(text, text, text, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.grant_membership_item_from_payment(
  p_user_id text,
  p_tier text,
  p_payment_id text,
  p_amount numeric DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_checkout_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_tier text := public.normalize_membership_tier(p_tier);
  label text;
  membership_slug text;
  existing record;
  checkout record;
  new_item_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RETURN json_build_object('ok', false, 'reason', 'service_role_required');
  END IF;

  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RETURN json_build_object('ok', false, 'reason', 'missing_user_id');
  END IF;

  IF p_payment_id IS NULL OR btrim(p_payment_id) = '' THEN
    RETURN json_build_object('ok', false, 'reason', 'missing_payment_id');
  END IF;

  IF clean_tier IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_tier');
  END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT *
    INTO checkout
    FROM public.membership_checkout_sessions
    WHERE id = p_checkout_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'reason', 'checkout_not_found');
    END IF;

    IF checkout.user_id <> p_user_id THEN
      RETURN json_build_object('ok', false, 'reason', 'checkout_user_mismatch');
    END IF;

    IF checkout.tier <> clean_tier THEN
      RETURN json_build_object('ok', false, 'reason', 'checkout_tier_mismatch');
    END IF;

    IF p_amount IS NOT NULL AND checkout.amount <> p_amount THEN
      RETURN json_build_object('ok', false, 'reason', 'checkout_amount_mismatch');
    END IF;
  END IF;

  SELECT *
  INTO existing
  FROM public.membership_payment_grants
  WHERE payment_id = p_payment_id;

  IF FOUND THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'grant_id', existing.id,
      'item_id', existing.item_id,
      'tier', existing.tier
    );
  END IF;

  label := public.membership_tier_label(clean_tier);
  membership_slug := 'membership:' || clean_tier;

  SELECT id
  INTO new_item_id
  FROM public.user_inventory
  WHERE user_id = p_user_id
    AND item_slug = membership_slug
    AND expires_at IS NULL
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF new_item_id IS NULL THEN
    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
    VALUES (
      p_user_id,
      membership_slug,
      'Membresia: ' || label || ' (30 dias)',
      1,
      NULL,
      jsonb_build_object(
        'source', 'mercadopago',
        'make_com', true,
        'tier', clean_tier,
        'duration_days', 30,
        'payment_id', p_payment_id,
        'amount', p_amount
      ) || COALESCE(p_payload, '{}'::jsonb)
    )
    RETURNING id INTO new_item_id;
  ELSE
    UPDATE public.user_inventory
    SET quantity = quantity + 1,
        item_name = 'Membresia: ' || label || ' (30 dias)',
        metadata = metadata || jsonb_build_object('last_payment_id', p_payment_id, 'last_payment_at', now()),
        updated_at = now()
    WHERE id = new_item_id;
  END IF;

  INSERT INTO public.membership_payment_grants (user_id, tier, payment_id, amount, item_id, payload)
  VALUES (p_user_id, clean_tier, p_payment_id, p_amount, new_item_id, COALESCE(p_payload, '{}'::jsonb));

  IF p_checkout_id IS NOT NULL THEN
    UPDATE public.membership_checkout_sessions
    SET status = 'granted',
        payment_id = p_payment_id,
        payload = payload || COALESCE(p_payload, '{}'::jsonb),
        updated_at = now()
    WHERE id = p_checkout_id;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'item_id', new_item_id,
    'item_slug', membership_slug,
    'tier', clean_tier,
    'item_name', 'Membresia: ' || label || ' (30 dias)'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.use_inventory_membership(p_stack_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  stack record;
  clean_tier text;
  previous_tier text;
  current_profile record;
  new_expires timestamptz;
  boosters_granted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT *
  INTO stack
  FROM public.user_inventory
  WHERE id = p_stack_id
    AND user_id = uid
    AND item_slug LIKE 'membership:%'
    AND quantity > 0
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'membership_item_not_available');
  END IF;

  clean_tier := public.normalize_membership_tier(COALESCE(stack.metadata->>'tier', replace(stack.item_slug, 'membership:', '')));
  IF clean_tier IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_tier');
  END IF;

  SELECT membership_tier, membership_expires_at
  INTO current_profile
  FROM public.profiles
  WHERE user_id::text = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'profile_not_found');
  END IF;

  previous_tier := lower(COALESCE(current_profile.membership_tier, 'novato'));
  boosters_granted := CASE clean_tier
    WHEN 'lite' THEN 1
    WHEN 'entusiasta' THEN 3
    WHEN 'coleccionista' THEN 5
    WHEN 'miembro del legado' THEN 7
    WHEN 'leyenda arcade' THEN 9
    WHEN 'creador de contenido' THEN 10
    ELSE 0
  END;

  new_expires := (
    CASE
      WHEN previous_tier = clean_tier
        AND current_profile.membership_expires_at IS NOT NULL
        AND current_profile.membership_expires_at > now()
      THEN current_profile.membership_expires_at
      ELSE now()
    END
  ) + interval '30 days';

  UPDATE public.profiles
  SET membership_tier = clean_tier,
      membership_expires_at = new_expires,
      updated_at = now()
  WHERE user_id::text = uid;

  -- Si el tier cambia, el trigger historico grant_membership_boosters_on_tier_change ya entrega los boosters.
  -- Si se renueva el mismo tier, el trigger no corre; aqui entregamos el pack comprado.
  IF previous_tier = clean_tier THEN
    PERFORM public.grant_membership_boosters(uid, clean_tier);
  END IF;

  IF stack.quantity > 1 THEN
    UPDATE public.user_inventory
    SET quantity = quantity - 1,
        updated_at = now()
    WHERE id = stack.id;
  ELSE
    DELETE FROM public.user_inventory
    WHERE id = stack.id;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'tier', clean_tier,
    'tier_label', public.membership_tier_label(clean_tier),
    'boosters_granted', boosters_granted,
    'expires_at', new_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_membership_checkout_session(text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_membership_item_from_payment(text, text, text, numeric, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.use_inventory_membership(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_membership_checkout_session(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_membership_item_from_payment(text, text, text, numeric, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.use_inventory_membership(uuid) TO authenticated;
