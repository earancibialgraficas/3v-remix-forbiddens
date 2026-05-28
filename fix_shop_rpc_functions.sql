-- ============================================================
-- 1. FUNCIÓN PARA ASIGNAR F-COINS (panel de moderación)
-- ============================================================
CREATE OR REPLACE FUNCTION grant_fcoins(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  -- Actualizar o crear billetera
  INSERT INTO point_wallets (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = point_wallets.balance + p_amount
  RETURNING balance INTO v_new_balance;
  
  RETURN json_build_object(
    'success', true, 
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Conceder permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION grant_fcoins TO authenticated;

-- ============================================================
-- 2. FUNCIÓN PARA COMPRAR ITEMS (actualizada con SECURITY DEFINER)
-- ============================================================
DROP FUNCTION IF EXISTS buy_shop_item(UUID, TEXT, TEXT, TEXT);

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
  VALUES (
    p_user_id, 
    p_item_slug, 
    p_item_name, 
    1, 
    jsonb_build_object('is_active', false, 'category', p_category)
  )
  RETURNING id INTO v_item_id;
  
  RETURN json_build_object(
    'success', true, 
    'item_id', v_item_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Conceder permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION buy_shop_item TO authenticated;
