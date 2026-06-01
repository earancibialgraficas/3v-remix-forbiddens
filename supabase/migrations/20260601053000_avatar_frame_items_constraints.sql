-- Allow avatar frames as shop items and as an independently equipped visual slot.

ALTER TABLE public.shop_items
  DROP CONSTRAINT IF EXISTS shop_items_category_check;

ALTER TABLE public.shop_items
  ADD CONSTRAINT shop_items_category_check
  CHECK (category IN (
    'launcher_skin',
    'agario_skin',
    'game_chest',
    'cosmetic',
    'membership',
    'event_ticket',
    'booster',
    'avatar_frame'
  ));

ALTER TABLE public.user_active_skins
  DROP CONSTRAINT IF EXISTS user_active_skins_skin_type_check;

ALTER TABLE public.user_active_skins
  ADD CONSTRAINT user_active_skins_skin_type_check
  CHECK (skin_type IN (
    'launcher',
    'agario',
    'game',
    'avatar_frame',
    'profile_transition'
  ));

NOTIFY pgrst, 'reload schema';
