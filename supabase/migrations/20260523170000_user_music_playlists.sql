CREATE TABLE IF NOT EXISTS public.user_music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  songs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_music_playlists_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT user_music_playlists_songs_is_array CHECK (jsonb_typeof(songs) = 'array')
);

ALTER TABLE public.user_music_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own music playlists"
  ON public.user_music_playlists;
CREATE POLICY "Users can read their own music playlists"
  ON public.user_music_playlists
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own music playlists"
  ON public.user_music_playlists;
CREATE POLICY "Users can insert their own music playlists"
  ON public.user_music_playlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own music playlists"
  ON public.user_music_playlists;
CREATE POLICY "Users can update their own music playlists"
  ON public.user_music_playlists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own music playlists"
  ON public.user_music_playlists;
CREATE POLICY "Users can delete their own music playlists"
  ON public.user_music_playlists
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_user_music_playlists_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_music_playlists_updated_at ON public.user_music_playlists;
CREATE TRIGGER set_user_music_playlists_updated_at
  BEFORE UPDATE ON public.user_music_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_music_playlists_updated_at();

CREATE INDEX IF NOT EXISTS user_music_playlists_user_updated_idx
  ON public.user_music_playlists(user_id, updated_at DESC);
