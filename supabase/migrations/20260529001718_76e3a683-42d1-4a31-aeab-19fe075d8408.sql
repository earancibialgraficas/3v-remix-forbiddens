
CREATE TABLE IF NOT EXISTS public.user_active_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skin_type text NOT NULL DEFAULT 'launcher',
  skin_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skin_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_skins TO authenticated;
GRANT SELECT ON public.user_active_skins TO anon;
GRANT ALL ON public.user_active_skins TO service_role;

ALTER TABLE public.user_active_skins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active skins viewable by everyone" ON public.user_active_skins;
CREATE POLICY "Active skins viewable by everyone"
  ON public.user_active_skins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own active skins" ON public.user_active_skins;
CREATE POLICY "Users insert own active skins"
  ON public.user_active_skins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own active skins" ON public.user_active_skins;
CREATE POLICY "Users update own active skins"
  ON public.user_active_skins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own active skins" ON public.user_active_skins;
CREATE POLICY "Users delete own active skins"
  ON public.user_active_skins FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
