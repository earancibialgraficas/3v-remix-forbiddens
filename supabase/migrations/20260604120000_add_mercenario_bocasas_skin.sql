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
  'mercenario_bocasas',
  'Skin Mercenario Bocasas',
  'Tema rojo y negro de estilo mercenario basado en la skin demoniaca, con armas, acero oscuro y energia carmesi.',
  15000,
  'stats',
  'launcher_skin',
  'lite',
  '/skins/mercenario_bocasas/store/thumbnail.png',
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
