-- Función RPC para comprar items de la tienda
CREATE OR REPLACE FUNCTION buy_shop_item(
  p_user_id UUID,
  p_item_slug TEXT,
  p_item_name TEXT,
  p_category TEXT
)
RETURNS JSON AS $$
DECLARE
  v_item_id UUID;
BEGIN
  INSERT INTO user_inventory (user_id, item_slug, item_name, quantity, metadata)
  VALUES (p_user_id, p_item_slug, p_item_name, 1, jsonb_build_object('is_active', false, 'category', p_category))
  RETURNING id INTO v_item_id;
  
  RETURN json_build_object('success', true, 'item_id', v_item_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION buy_shop_item TO authenticated;
