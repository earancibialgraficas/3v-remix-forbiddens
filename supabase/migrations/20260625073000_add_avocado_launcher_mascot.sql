INSERT INTO public.shop_items (
  slug,
  name,
  description,
  price,
  price_type,
  image_url,
  category,
  tier_requirement,
  is_active,
  tradeable
)
VALUES (
  'avocado_palta',
  'Mascota Palta 3D',
  'Mascota 3D riggeada para el launcher nativo, con animaciones de idle, caminar, hablar, dormir y reacciones al companion.',
  12000,
  'fcoins',
  '/mascot/avocado/base.png',
  'launcher_mascot',
  'lite',
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  is_active = EXCLUDED.is_active,
  tradeable = EXCLUDED.tradeable,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
