
ALTER TABLE public.profiles
  ADD COLUMN color_avatar_border text DEFAULT NULL,
  ADD COLUMN color_name text DEFAULT NULL,
  ADD COLUMN color_role text DEFAULT NULL,
  ADD COLUMN color_staff_role text DEFAULT NULL;
