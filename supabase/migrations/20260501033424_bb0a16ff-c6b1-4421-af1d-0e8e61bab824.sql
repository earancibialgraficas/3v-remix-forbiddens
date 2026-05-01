-- leaderboard_scores: game_state
ALTER TABLE public.leaderboard_scores
  ADD COLUMN IF NOT EXISTS game_state text;

-- profiles: signature_font_size
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_font_size integer DEFAULT 14;

-- photos: is_banned, is_apify
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_apify boolean NOT NULL DEFAULT false;

-- social_content: is_banned
ALTER TABLE public.social_content
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- posts: is_banned
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;