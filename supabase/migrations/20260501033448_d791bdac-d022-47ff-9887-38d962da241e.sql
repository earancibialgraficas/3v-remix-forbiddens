ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid;