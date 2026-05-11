-- Table that mirrors each user's Google Drive ROMs
CREATE TABLE IF NOT EXISTS public.user_drive_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drive_file_id text NOT NULL,
  file_name text NOT NULL,
  console_type text NOT NULL,
  custom_name text,
  custom_cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, drive_file_id)
);

CREATE INDEX IF NOT EXISTS idx_user_drive_games_user ON public.user_drive_games(user_id);

ALTER TABLE public.user_drive_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own drive games" ON public.user_drive_games;
CREATE POLICY "Users can read own drive games"
  ON public.user_drive_games FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own drive games" ON public.user_drive_games;
CREATE POLICY "Users can insert own drive games"
  ON public.user_drive_games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own drive games" ON public.user_drive_games;
CREATE POLICY "Users can update own drive games"
  ON public.user_drive_games FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own drive games" ON public.user_drive_games;
CREATE POLICY "Users can delete own drive games"
  ON public.user_drive_games FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_drive_games_updated_at ON public.user_drive_games;
CREATE TRIGGER trg_user_drive_games_updated_at
  BEFORE UPDATE ON public.user_drive_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();