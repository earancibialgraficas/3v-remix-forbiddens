-- Nueva transicion cosmetica de perfil: Dragon de Fuego.

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
  'dragon_fuego',
  'Transicion Dragon de Fuego',
  'Un dragon ardiente atraviesa la pantalla para presentar tu perfil.',
  5000,
  'fcoins',
  'cosmetic',
  'novato',
  '/cosmetics/transitions/dragon-fire/dragon-fire.mp4',
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
