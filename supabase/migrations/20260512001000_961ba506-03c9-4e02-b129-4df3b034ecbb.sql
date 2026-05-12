CREATE TABLE IF NOT EXISTS public.user_game_covers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  custom_name text,
  custom_cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, file_name)
);

ALTER TABLE public.user_game_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game covers"
  ON public.user_game_covers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game covers"
  ON public.user_game_covers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game covers"
  ON public.user_game_covers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own game covers"
  ON public.user_game_covers FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_game_covers_user ON public.user_game_covers(user_id);