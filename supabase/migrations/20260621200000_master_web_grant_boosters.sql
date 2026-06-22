-- Permite al WebMaster regalar potenciadores x3 a un usuario concreto.
-- La autorizacion vive en la base de datos; ocultar el control en la UI no basta.

CREATE OR REPLACE FUNCTION public.grant_user_boosters(
  p_user_id text,
  p_quantity integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id text := auth.uid()::text;
  clean_user_id text := btrim(COALESCE(p_user_id, ''));
  qty integer := COALESCE(p_quantity, 0);
  new_stack_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.has_role(auth.uid(), 'master_web'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'master_web_required');
  END IF;

  IF clean_user_id = '' OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id::text = clean_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found');
  END IF;

  IF qty < 1 OR qty > 1000 THEN
    RETURN json_build_object('success', false, 'error', 'quantity_must_be_between_1_and_1000');
  END IF;

  INSERT INTO public.user_inventory (
    user_id,
    item_slug,
    item_name,
    quantity,
    expires_at,
    metadata
  )
  VALUES (
    clean_user_id,
    'points_x3_week',
    'Potenciador x3 de puntos',
    qty,
    NULL,
    jsonb_build_object(
      'multiplier', 3,
      'duration_days', 7,
      'source', 'master_web_gift',
      'granted_by', caller_id,
      'granted_at', now()
    )
  )
  RETURNING id INTO new_stack_id;

  RETURN json_build_object(
    'success', true,
    'stack_id', new_stack_id,
    'user_id', clean_user_id,
    'quantity', qty
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_user_boosters(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_user_boosters(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_user_boosters(text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
