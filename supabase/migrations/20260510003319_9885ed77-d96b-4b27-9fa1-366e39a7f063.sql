
-- comments: history
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS original_content text,
  ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false;

-- social_comments: history + updated_at + UPDATE policy
ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS original_content text,
  ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "Owners can update social comments" ON public.social_comments;
CREATE POLICY "Owners can update social comments"
ON public.social_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- posts: title alignment
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title_align text NOT NULL DEFAULT 'left'
  CHECK (title_align IN ('left','center','right'));
