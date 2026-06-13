-- Nueva skin completa para website/launcher: Mi Melodia Rosa.

INSERT INTO public.shop_items (
  slug,
  name,
  description,
  price,
  price_type,
  category,
  tier_requirement,
  image_url,
  is_active,
  tradeable
)
VALUES (
  'mi_melodia_rosa',
  'Mi Melodia Rosa',
  'Skin rosa pastel con texturas, marcos, avatar frame y launcher tematico.',
  15000,
  'stats',
  'launcher_skin',
  'lite',
  '/skins/mi_melodia_rosa/store/thumbnail.png',
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active,
  tradeable = EXCLUDED.tradeable,
  updated_at = now();
