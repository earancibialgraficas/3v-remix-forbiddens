
CREATE TABLE public.presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  last_seen timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presence viewable by everyone" ON public.presence FOR SELECT USING (true);
CREATE POLICY "Users can upsert own presence" ON public.presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presence" ON public.presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own presence" ON public.presence FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
