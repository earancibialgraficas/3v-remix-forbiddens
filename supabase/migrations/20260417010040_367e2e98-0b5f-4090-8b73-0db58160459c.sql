
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS signature_stroke_width integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signature_stroke_position text DEFAULT 'middle',
  ADD COLUMN IF NOT EXISTS signature_text_over_image boolean DEFAULT false;
