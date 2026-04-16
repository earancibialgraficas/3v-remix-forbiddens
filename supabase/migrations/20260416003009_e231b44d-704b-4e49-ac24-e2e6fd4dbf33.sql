
-- Social reactions table
CREATE TABLE IF NOT EXISTS public.social_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL, -- 'social_content' or 'photo'
  target_id uuid NOT NULL,
  reaction_type text NOT NULL, -- 'like' or 'dislike'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);
ALTER TABLE public.social_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions viewable by everyone" ON public.social_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.social_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON public.social_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update reactions" ON public.social_reactions FOR UPDATE USING (auth.uid() = user_id);

-- Social comments table
CREATE TABLE IF NOT EXISTS public.social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by everyone" ON public.social_comments FOR SELECT USING (true);
CREATE POLICY "Users can add comments" ON public.social_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.social_comments FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master_web') OR has_role(auth.uid(), 'moderator'));

-- Add likes/dislikes and content_type to social_content
ALTER TABLE public.social_content ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0;
ALTER TABLE public.social_content ADD COLUMN IF NOT EXISTS dislikes integer NOT NULL DEFAULT 0;
ALTER TABLE public.social_content ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video';

-- Advanced signature columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_font_family text DEFAULT 'Inter';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_stroke_color text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_text_align text DEFAULT 'center';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_image_align text DEFAULT 'center';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_image_width integer DEFAULT 100;

-- Atomic toggle for social reactions
CREATE OR REPLACE FUNCTION public.toggle_social_reaction(
  p_target_type text, p_target_id uuid, p_user_id uuid, p_reaction_type text
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  existing record;
  new_likes integer;
  new_dislikes integer;
  user_reaction text;
BEGIN
  SELECT * INTO existing FROM social_reactions
    WHERE user_id = p_user_id AND target_type = p_target_type AND target_id = p_target_id
    FOR UPDATE;

  IF existing IS NOT NULL THEN
    IF existing.reaction_type = p_reaction_type THEN
      DELETE FROM social_reactions WHERE id = existing.id;
      user_reaction := NULL;
    ELSE
      UPDATE social_reactions SET reaction_type = p_reaction_type WHERE id = existing.id;
      user_reaction := p_reaction_type;
    END IF;
  ELSE
    INSERT INTO social_reactions (user_id, target_type, target_id, reaction_type)
    VALUES (p_user_id, p_target_type, p_target_id, p_reaction_type);
    user_reaction := p_reaction_type;
  END IF;

  SELECT COUNT(*) FILTER (WHERE reaction_type='like'), COUNT(*) FILTER (WHERE reaction_type='dislike')
    INTO new_likes, new_dislikes
    FROM social_reactions WHERE target_type = p_target_type AND target_id = p_target_id;

  IF p_target_type = 'social_content' THEN
    UPDATE social_content SET likes = new_likes, dislikes = new_dislikes WHERE id = p_target_id;
  ELSIF p_target_type = 'photo' THEN
    UPDATE photos SET likes = new_likes, dislikes = new_dislikes WHERE id = p_target_id;
  END IF;

  RETURN json_build_object('likes', new_likes, 'dislikes', new_dislikes, 'user_reaction', user_reaction);
END;
$$;

-- Staff report RPC
CREATE OR REPLACE FUNCTION public.send_staff_report(
  p_reporter_id uuid, p_reported_user_id uuid, p_reason text, p_details text, p_post_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  staff_user record;
  reporter_name text;
BEGIN
  INSERT INTO reports (reporter_id, reported_user_id, reason, post_id)
  VALUES (p_reporter_id, p_reported_user_id, p_reason, p_post_id);

  SELECT display_name INTO reporter_name FROM profiles WHERE user_id = p_reporter_id LIMIT 1;

  FOR staff_user IN
    SELECT DISTINCT ur.user_id FROM user_roles ur
    WHERE ur.role IN ('master_web', 'admin', 'moderator')
  LOOP
    INSERT INTO inbox_messages (sender_id, receiver_id, content, message_type, channel)
    VALUES (p_reporter_id, staff_user.user_id,
      '⚠️ REPORTE de ' || COALESCE(reporter_name,'Anónimo') || ': ' || p_reason || CASE WHEN p_details <> '' THEN ' — ' || p_details ELSE '' END,
      'report', 'staff');
    INSERT INTO notifications (user_id, type, title, body, related_id)
    VALUES (staff_user.user_id, 'report', 'Nuevo reporte', COALESCE(reporter_name,'Anónimo') || ' reportó a un usuario: ' || p_reason, p_reported_user_id::text);
  END LOOP;
END;
$$;
