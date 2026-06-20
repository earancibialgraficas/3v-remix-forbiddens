-- Each console may keep its own equipped shell. Website themes and the other
-- cosmetic slots remain in user_active_skins.
CREATE TABLE IF NOT EXISTS public.user_active_emulator_shells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  console_id text NOT NULL,
  shell_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_active_emulator_shells_console_check
    CHECK (console_id IN ('nes', 'snes', 'gba', 'gbc', 'sega', 'n64', 'arcade', 'ds', 'ps1')),
  UNIQUE (user_id, console_id)
);

ALTER TABLE public.user_active_emulator_shells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Emulator shells viewable by everyone" ON public.user_active_emulator_shells;
CREATE POLICY "Emulator shells viewable by everyone"
  ON public.user_active_emulator_shells FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own emulator shells" ON public.user_active_emulator_shells;
CREATE POLICY "Users insert own emulator shells"
  ON public.user_active_emulator_shells FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own emulator shells" ON public.user_active_emulator_shells;
CREATE POLICY "Users update own emulator shells"
  ON public.user_active_emulator_shells FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own emulator shells" ON public.user_active_emulator_shells;
CREATE POLICY "Users delete own emulator shells"
  ON public.user_active_emulator_shells FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_emulator_shells TO authenticated;
GRANT SELECT ON public.user_active_emulator_shells TO anon;
GRANT ALL ON public.user_active_emulator_shells TO service_role;

-- Preserve currently equipped shells when this migration is installed.
INSERT INTO public.user_active_emulator_shells (user_id, console_id, shell_slug)
SELECT
  user_id,
  CASE skin_slug
    WHEN 'rosita_nes' THEN 'nes'
    WHEN 'snes_retro' THEN 'snes'
    ELSE NULL
  END,
  skin_slug
FROM public.user_active_skins
WHERE skin_type = 'emulator_shell'
  AND skin_slug IN ('rosita_nes', 'snes_retro')
ON CONFLICT (user_id, console_id) DO UPDATE SET
  shell_slug = EXCLUDED.shell_slug,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
