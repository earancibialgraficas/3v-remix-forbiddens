ALTER TABLE public.shop_items
  DROP CONSTRAINT IF EXISTS shop_items_category_check;

ALTER TABLE public.shop_items
  ADD CONSTRAINT shop_items_category_check
  CHECK (
    category IN (
      'launcher_skin',
      'agario_skin',
      'game_chest',
      'cosmetic',
      'membership',
      'event_ticket',
      'booster',
      'avatar_frame',
      'emulator_shell',
      'launcher_mascot'
    )
  );

ALTER TABLE public.user_active_skins
  DROP CONSTRAINT IF EXISTS user_active_skins_skin_type_check;

ALTER TABLE public.user_active_skins
  ADD CONSTRAINT user_active_skins_skin_type_check
  CHECK (
    skin_type IN (
      'launcher',
      'agario',
      'game',
      'avatar_frame',
      'profile_transition',
      'emulator_shell',
      'launcher_mascot'
    )
  );

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
  'dragon_noxito',
  'Mascota Dragon Noxito',
  'Companero animado para el launcher nativo con burbuja de texto, sonido estilo juego cozy y reacciones al jugar.',
  10000,
  'fcoins',
  '/mascot/dragon/base.png',
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
