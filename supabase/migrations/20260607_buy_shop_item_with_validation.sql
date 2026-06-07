-- ============================================================
-- FUNCIÓN MEJORADA PARA COMPRAR ITEMS DE LA TIENDA
-- Valida monedas/puntos ANTES de hacer cambios
-- Deducción y inserción atómicas
-- ============================================================
DROP FUNCTION IF EXISTS public.buy_shop_item_with_validation(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT);

CREATE OR REPLACE FUNCTION public.buy_shop_item_with_validation(
  p_user_id UUID,
  p_item_slug TEXT,
  p_item_name TEXT,
  p_category TEXT,
  p_price BIGINT,
  p_price_type TEXT  -- 'stats' o 'fcoins'
)
RETURNS JSON AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_item_id UUID;
  v_error_msg TEXT;
BEGIN
  -- Validar que p_user_id no sea NULL
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_user',
      'error', 'Usuario inválido'
    );
  END IF;

  -- Validar precio positivo
  IF COALESCE(p_price, 0) <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_price',
      'error', 'Precio inválido'
    );
  END IF;

  -- Validar tipo de precio
  IF p_price_type NOT IN ('stats', 'fcoins') THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_price_type',
      'error', 'Tipo de moneda inválido'
    );
  END IF;

  -- ============================================================
  -- VALIDAR Y DEDUCIR STATS
  -- ============================================================
  IF p_price_type = 'stats' THEN
    SELECT COALESCE(total_score, 0)
    INTO v_current_balance
    FROM public.profiles
    WHERE user_id = p_user_id::text
    FOR UPDATE;

    -- Validar que hay suficientes puntos
    IF COALESCE(v_current_balance, 0) < p_price THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'insufficient_stats',
        'error', 'No tienes suficientes puntos STATS',
        'required', p_price,
        'current', COALESCE(v_current_balance, 0)
      );
    END IF;

    -- Deducir stats
    v_new_balance := v_current_balance - p_price;
    
    UPDATE public.profiles
    SET total_score = v_new_balance, updated_at = now()
    WHERE user_id = p_user_id::text;

    -- Registrar el evento
    INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
    VALUES (p_user_id, p_user_id, 'shop_purchase_stats', gen_random_uuid(), -p_price);

  -- ============================================================
  -- VALIDAR Y DEDUCIR FCOINS
  -- ============================================================
  ELSIF p_price_type = 'fcoins' THEN
    -- Asegurar que existe la billetera
    INSERT INTO public.point_wallets (user_id, balance)
    VALUES (p_user_id::text, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT balance
    INTO v_current_balance
    FROM public.point_wallets
    WHERE user_id = p_user_id::text
    FOR UPDATE;

    -- Validar que hay suficientes F-coins
    IF COALESCE(v_current_balance, 0) < p_price THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'insufficient_fcoins',
        'error', 'No tienes suficientes F-COINS',
        'required', p_price,
        'current', COALESCE(v_current_balance, 0)
      );
    END IF;

    -- Deducir F-coins
    v_new_balance := v_current_balance - p_price;

    UPDATE public.point_wallets
    SET balance = v_new_balance, updated_at = now()
    WHERE user_id = p_user_id::text;

    -- Registrar el evento
    INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
    VALUES (p_user_id, p_user_id, 'shop_purchase_fcoins', gen_random_uuid(), -p_price);
  END IF;

  -- ============================================================
  -- INSERTAR ITEM EN INVENTARIO
  -- ============================================================
  BEGIN
    INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, metadata)
    VALUES (
      p_user_id,
      p_item_slug,
      p_item_name,
      1,
      jsonb_build_object('is_active', false, 'category', p_category, 'purchased_at', now()::text)
    )
    RETURNING id INTO v_item_id;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    
    -- ROLLBACK: Si falla la inserción, revertir la deducción
    IF p_price_type = 'stats' THEN
      UPDATE public.profiles
      SET total_score = v_current_balance, updated_at = now()
      WHERE user_id = p_user_id::text;
    ELSIF p_price_type = 'fcoins' THEN
      UPDATE public.point_wallets
      SET balance = v_current_balance, updated_at = now()
      WHERE user_id = p_user_id::text;
    END IF;

    RETURN json_build_object(
      'success', false,
      'reason', 'inventory_insert_failed',
      'error', 'Error al agregar item: ' || v_error_msg
    );
  END;

  -- ============================================================
  -- RETORNAR ÉXITO
  -- ============================================================
  RETURN json_build_object(
    'success', true,
    'item_id', v_item_id,
    'new_balance', v_new_balance,
    'balance_type', p_price_type
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'reason', 'unexpected_error',
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Conceder permisos
GRANT EXECUTE ON FUNCTION public.buy_shop_item_with_validation(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT) TO authenticated;
