-- Tabla para indexar las partidas guardadas en Google Drive
CREATE TABLE IF NOT EXISTS public.user_drive_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_name text NOT NULL,
  console_type text NOT NULL,
  drive_file_id text NOT NULL,
  file_name text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_name, console_type)
);

ALTER TABLE public.user_drive_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drive saves"
  ON public.user_drive_saves FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drive saves"
  ON public.user_drive_saves FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drive saves"
  ON public.user_drive_saves FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drive saves"
  ON public.user_drive_saves FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_drive_saves_updated_at
  BEFORE UPDATE ON public.user_drive_saves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();