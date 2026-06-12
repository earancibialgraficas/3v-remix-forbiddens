-- Nueva skin de consola web: SNES Retro vertical.

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
  'snes_retro',
  'Consola Retro SNES',
  'Interfaz vertical para juegos SNES en celular y tablet.',
  10000,
  'fcoins',
  'emulator_shell',
  'lite',
  '/emulator-shells/snes-retro/vertical-celular.svg',
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
