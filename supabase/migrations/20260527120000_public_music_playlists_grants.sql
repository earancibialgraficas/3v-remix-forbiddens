GRANT SELECT ON public.user_music_playlists TO anon, authenticated;

DROP POLICY IF EXISTS "Public profiles can read music playlists"
  ON public.user_music_playlists;

CREATE POLICY "Public profiles can read music playlists"
  ON public.user_music_playlists
  FOR SELECT
  TO anon, authenticated
  USING (true);
