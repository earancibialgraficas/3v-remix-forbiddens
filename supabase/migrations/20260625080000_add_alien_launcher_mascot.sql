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
  'alien_animal',
  'Mascota Alien 3D',
  'Mascota alienigena 3D para el launcher nativo, con modelo riggeado y animaciones reales de idle, caminar, correr y reaccionar.',
  14000,
  'fcoins',
  '/mascot/alien/base.svg',
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
