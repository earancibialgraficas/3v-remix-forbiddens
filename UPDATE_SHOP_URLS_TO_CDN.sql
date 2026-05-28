-- ========================================================================
-- ACTUALIZAR URLS DE ASSETS A CDN (GitHub/jsDelivr)
-- ========================================================================
-- 
-- Reemplaza 'tu-usuario' con tu usuario de GitHub
-- Reemplaza 'forbiddens-skins-assets' si usaste otro nombre para el repo
-- 
-- IMPORTANTE: Para usar jsDelivr, el repositorio debe ser público.
-- Si lo dejas privado, jsDelivr no podrá servir las imágenes.
-- ========================================================================

-- Corregir inventario de usuarios que ya tenga la skin con el slug antiguo
UPDATE user_inventory
SET item_slug = 'demoniaco'
WHERE item_slug = 'satanic';

-- Actualizar la fila existente de demoniaco si ya existe
UPDATE shop_items
SET name = 'Skin Demoniaco',
    description = 'Estilo oscuro rojo demoníaco con efectos de fuego infernal. Interfaz completa del website cambia a tema demoniaco 🔥'
WHERE slug = 'demoniaco';

-- Eliminar cualquier fila con slug antiguo si existe
DELETE FROM shop_items
WHERE slug = 'satanic';

-- Opción 1: Usar GitHub Raw (simple)
-- URL patrón: https://raw.githubusercontent.com/tu-usuario/forbiddens-skins-assets/main/demoniaco/...

UPDATE shop_items 
SET image_url = 'https://raw.githubusercontent.com/tu-usuario/forbiddens-skins-assets/main/demoniaco/backgrounds/main-bg.webp'
WHERE slug = 'demoniaco';

-- Opción 2: Usar jsDelivr CDN (MÁS RÁPIDO - RECOMENDADO ⭐)
-- URL patrón: https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/...

UPDATE shop_items 
SET image_url = 'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/backgrounds/main-bg.webp'
WHERE slug = 'demoniaco';

-- Ejemplo completo para la skin demoniaco:
INSERT INTO shop_items (slug, name, description, price, price_type, category, tier_requirement, image_url)
VALUES 
  (
    'demoniaco',
    'Skin Demoniaco',
    'Estilo oscuro rojo demoníaco con efectos de fuego infernal. Interfaz completa del website cambia a tema demoniaco 🔥',
    15000,
    'stats',
    'launcher_skin',
    'lite',
    'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/backgrounds/main-bg.webp'
  )
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url;

-- Actualizar todas las skins a usar CDN (si tienes más)
UPDATE shop_items 
SET image_url = REPLACE(
  image_url, 
  'https://images.unsplash.com',
  'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main'
)
WHERE category = 'launcher_skin' AND image_url LIKE '%unsplash%';

-- ========================================================================
-- CAMBIOS DE URLS POR ARCHIVO (MAPEO DE ASSETS)
-- ========================================================================
-- Copia esto en populate_shop.sql para futuras poblaciones:

/*
  (
    'demoniaco',
    'Skin Demoniaco',
    'Estilo oscuro rojo demoníaco con efectos de fuego infernal. Interfaz completa del website cambia a tema demoniaco 🔥',
    15000,
    'stats',
    'launcher_skin',
    'lite',
    'https://cdn.jsdelivr.net/gh/tu-usuario/forbiddens-skins-assets@main/demoniaco/backgrounds/main-bg.webp'
  ),
*/

-- ========================================================================
-- VERIFICACIÓN: Ejecuta esto para verificar que las URLs se actualizaron
-- ========================================================================
SELECT 
  slug, 
  name, 
  image_url,
  LENGTH(image_url) as url_length,
  CASE 
    WHEN image_url LIKE '%cdn.jsdelivr.net%' THEN '✅ CDN jsDelivr'
    WHEN image_url LIKE '%raw.githubusercontent.com%' THEN '✅ GitHub Raw'
    WHEN image_url LIKE '%supabase%' THEN '❌ Aún en Supabase'
    ELSE '⚠️ Otro origen'
  END as status
FROM shop_items
WHERE category = 'launcher_skin'
ORDER BY slug;
