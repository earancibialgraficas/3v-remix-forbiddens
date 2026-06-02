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
      'emulator_shell'
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
      'emulator_shell'
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
  'rosita_nes',
  'Consola Rosita NES',
  'Interfaz web rosada para juegos NES. Esta base queda lista para ampliar compatibilidad a mas consolas web.',
  10000,
  'fcoins',
  '/emulator-shells/rosita-nes/thumbnail.svg',
  'emulator_shell',
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
