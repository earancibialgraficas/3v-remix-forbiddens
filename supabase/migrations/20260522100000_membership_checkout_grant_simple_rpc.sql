-- RPC simple para Make.com: entrega la membresia usando solo el checkout_id creado por el sitio.
-- Evita mapear user_id/tier/monto desde MercadoPago, porque esos datos ya viven en membership_checkout_sessions.

CREATE OR REPLACE FUNCTION public.grant_membership_item_from_checkout(
  p_checkout_id uuid,
  p_payment_id text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkout record;
  clean_payment_id text := btrim(COALESCE(p_payment_id, ''));
  result json;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RETURN json_build_object('ok', false, 'reason', 'service_role_required');
  END IF;

  IF p_checkout_id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'missing_checkout_id');
  END IF;

  IF clean_payment_id = '' THEN
    clean_payment_id := p_checkout_id::text;
  END IF;

  SELECT *
  INTO checkout
  FROM public.membership_checkout_sessions
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'checkout_not_found');
  END IF;

  IF checkout.status = 'granted' THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'checkout_id', checkout.id,
      'payment_id', COALESCE(checkout.payment_id, clean_payment_id),
      'tier', checkout.tier
    );
  END IF;

  result := public.grant_membership_item_from_payment(
    checkout.user_id,
    checkout.tier,
    clean_payment_id,
    checkout.amount,
    COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
      'checkout_id', checkout.id,
      'checkout_currency', checkout.currency
    ),
    checkout.id
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_membership_item_from_checkout(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_membership_item_from_checkout(uuid, text, jsonb) TO service_role;
