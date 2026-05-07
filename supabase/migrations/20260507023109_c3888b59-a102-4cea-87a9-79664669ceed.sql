-- Add image storage column to events (separate from image_url which holds the title color)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_storage_url TEXT;

-- Create public bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Staff can upload event images" ON storage.objects;
CREATE POLICY "Staff can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'master_web') OR
    public.has_role(auth.uid(), 'moderator')
  )
);

DROP POLICY IF EXISTS "Staff can update event images" ON storage.objects;
CREATE POLICY "Staff can update event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'master_web') OR
    public.has_role(auth.uid(), 'moderator')
  )
);

DROP POLICY IF EXISTS "Staff can delete event images" ON storage.objects;
CREATE POLICY "Staff can delete event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'master_web') OR
    public.has_role(auth.uid(), 'moderator')
  )
);

-- Relax check constraint to support all event types used by the UI
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (event_type = ANY (ARRAY['torneo','estreno','rodada','stream','sorteo','comunidad','podcast','otro']));