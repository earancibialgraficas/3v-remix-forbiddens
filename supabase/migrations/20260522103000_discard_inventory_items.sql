-- Permite desechar items propios del inventario desde la UI.

CREATE OR REPLACE FUNCTION public.discard_inventory_items(
  p_items jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  entry jsonb;
  stack record;
  requested integer;
  discarded integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_items');
  END IF;

  FOR entry IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(entry->>'id', '') = '' THEN
      CONTINUE;
    END IF;

    requested := CASE
      WHEN COALESCE(entry->>'quantity', '') ~ '^[0-9]+$' THEN GREATEST((entry->>'quantity')::integer, 0)
      ELSE 0
    END;

    IF requested <= 0 THEN
      CONTINUE;
    END IF;

    SELECT *
    INTO stack
    FROM public.user_inventory
    WHERE id::text = entry->>'id'
      AND user_id = uid
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF requested >= COALESCE(stack.quantity, 0) THEN
      discarded := discarded + COALESCE(stack.quantity, 0);
      DELETE FROM public.user_inventory
      WHERE id = stack.id;
    ELSE
      discarded := discarded + requested;
      UPDATE public.user_inventory
      SET quantity = quantity - requested,
          updated_at = now()
      WHERE id = stack.id;
    END IF;
  END LOOP;

  RETURN json_build_object('ok', true, 'discarded', discarded);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.discard_inventory_items(jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.discard_inventory_items(jsonb) TO authenticated;
