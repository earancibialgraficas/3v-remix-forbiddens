
CREATE TABLE public.social_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'facebook')),
  content_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public content viewable by everyone"
ON public.social_content FOR SELECT
USING (is_public = true OR auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master_web'));

CREATE POLICY "Users can insert their own content"
ON public.social_content FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content"
ON public.social_content FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content"
ON public.social_content FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master_web'));

CREATE TRIGGER update_social_content_updated_at
BEFORE UPDATE ON public.social_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
