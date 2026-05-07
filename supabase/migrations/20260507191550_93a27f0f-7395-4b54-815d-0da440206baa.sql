CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  original_id uuid,
  title text DEFAULT '',
  thumbnail_url text,
  redirect_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved items"
ON public.saved_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save items"
ON public.saved_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved items"
ON public.saved_items FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_items_unique ON public.saved_items(user_id, item_type, original_id);