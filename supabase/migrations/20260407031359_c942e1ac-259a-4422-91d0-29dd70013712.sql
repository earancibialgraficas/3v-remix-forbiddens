
-- Attach the existing handle_new_user function as a trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (user_id, display_name)
VALUES
  ('65833802-b9ad-49be-a0cd-a79a6b92f54c', 'Orphen'),
  ('ad8752e1-a8c6-4c14-9e35-3ddddfd5eb53', 'Lubb'),
  ('64671109-9b05-4e87-b4d2-4dd6ffaf903b', 'kimoshiikarin')
ON CONFLICT DO NOTHING;

-- Backfill user_roles for existing users
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('65833802-b9ad-49be-a0cd-a79a6b92f54c', 'user'),
  ('ad8752e1-a8c6-4c14-9e35-3ddddfd5eb53', 'user'),
  ('64671109-9b05-4e87-b4d2-4dd6ffaf903b', 'user')
ON CONFLICT DO NOTHING;
