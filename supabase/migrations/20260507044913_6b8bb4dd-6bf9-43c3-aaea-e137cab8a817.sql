-- ============================================================
-- Función central: límites por membresía
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_membership_limits(_user_id uuid)
RETURNS TABLE (
  max_forum_chars int,
  max_dm_chars int,
  max_photos int,
  max_social_content int,
  max_friends int,
  is_staff boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier text;
  staff boolean;
BEGIN
  staff := public.has_role(_user_id, 'master_web'::app_role)
        OR public.has_role(_user_id, 'admin'::app_role)
        OR public.has_role(_user_id, 'moderator'::app_role);

  SELECT LOWER(COALESCE(membership_tier, 'novato')) INTO tier
  FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  IF staff THEN
    RETURN QUERY SELECT 10000, 10000, 999, 999, 999, true;
  ELSIF tier = 'creador de contenido' THEN
    RETURN QUERY SELECT 5000, 5000, 999, 999, 999, false;
  ELSIF tier = 'leyenda arcade' THEN
    RETURN QUERY SELECT 3000, 2500, 100, 100, 500, false;
  ELSIF tier = 'miembro del legado' THEN
    RETURN QUERY SELECT 2000, 1500, 90, 90, 200, false;
  ELSIF tier = 'coleccionista' THEN
    RETURN QUERY SELECT 1500, 800, 50, 50, 100, false;
  ELSIF tier = 'entusiasta' THEN
    RETURN QUERY SELECT 1000, 500, 30, 30, 50, false;
  ELSIF tier = 'lite' THEN
    RETURN QUERY SELECT 500, 300, 15, 15, 25, false;
  ELSE
    RETURN QUERY SELECT 500, 200, 15, 15, 25, false;
  END IF;
END;
$$;

-- ============================================================
-- Trigger: posts (foro) - límite de caracteres y título
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_post_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.user_id);
  IF lim.is_staff THEN RETURN NEW; END IF;

  IF char_length(COALESCE(NEW.content, '')) > lim.max_forum_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres en el contenido del post.', lim.max_forum_chars;
  END IF;
  IF char_length(COALESCE(NEW.title, '')) > 150 THEN
    RAISE EXCEPTION 'El título del post no puede superar 150 caracteres.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_post_limits ON public.posts;
CREATE TRIGGER trg_enforce_post_limits
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_post_limits();

-- ============================================================
-- Trigger: comments del foro - límite de caracteres
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_comment_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.user_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  IF char_length(COALESCE(NEW.content, '')) > lim.max_forum_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres por comentario.', lim.max_forum_chars;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_comment_limits ON public.comments;
CREATE TRIGGER trg_enforce_comment_limits
BEFORE INSERT OR UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_limits();

-- ============================================================
-- Trigger: social_comments - mismo tope de caracteres
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_social_comment_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.user_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  IF char_length(COALESCE(NEW.content, '')) > lim.max_forum_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres por comentario.', lim.max_forum_chars;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_social_comment_limits ON public.social_comments;
CREATE TRIGGER trg_enforce_social_comment_limits
BEFORE INSERT OR UPDATE ON public.social_comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_social_comment_limits();

-- ============================================================
-- Trigger: private_messages - límite DM
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_private_message_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.sender_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  IF char_length(COALESCE(NEW.content, '')) > lim.max_dm_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres por mensaje privado.', lim.max_dm_chars;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_private_message_limits ON public.private_messages;
CREATE TRIGGER trg_enforce_private_message_limits
BEFORE INSERT OR UPDATE ON public.private_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_private_message_limits();

-- ============================================================
-- Trigger: inbox_messages - límite DM (solo mensajes de usuario, no system bot)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_inbox_message_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
  bot_id uuid := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105'::uuid;
BEGIN
  -- No limitar mensajes del bot del sistema (reportes, avisos staff)
  IF NEW.sender_id = bot_id THEN RETURN NEW; END IF;

  SELECT * INTO lim FROM public.get_membership_limits(NEW.sender_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  IF char_length(COALESCE(NEW.content, '')) > lim.max_dm_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres por mensaje.', lim.max_dm_chars;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_inbox_message_limits ON public.inbox_messages;
CREATE TRIGGER trg_enforce_inbox_message_limits
BEFORE INSERT OR UPDATE ON public.inbox_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_inbox_message_limits();

-- ============================================================
-- Trigger: photos - límite de fotos por usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_photo_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
  current_count int;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.user_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO current_count FROM public.photos WHERE user_id = NEW.user_id;
  IF current_count >= lim.max_photos THEN
    RAISE EXCEPTION 'Has alcanzado el límite de % fotos de tu membresía.', lim.max_photos;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_photo_limits ON public.photos;
CREATE TRIGGER trg_enforce_photo_limits
BEFORE INSERT ON public.photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_photo_limits();

-- ============================================================
-- Trigger: social_content - límite de publicaciones del Hub
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_social_content_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
  current_count int;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.user_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO current_count FROM public.social_content WHERE user_id = NEW.user_id;
  IF current_count >= lim.max_social_content THEN
    RAISE EXCEPTION 'Has alcanzado el límite de % publicaciones de tu membresía.', lim.max_social_content;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_social_content_limits ON public.social_content;
CREATE TRIGGER trg_enforce_social_content_limits
BEFORE INSERT ON public.social_content
FOR EACH ROW EXECUTE FUNCTION public.enforce_social_content_limits();

-- ============================================================
-- Trigger: friend_requests - tope de amigos del emisor
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_friend_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
  friend_count int;
BEGIN
  SELECT * INTO lim FROM public.get_membership_limits(NEW.sender_id);
  IF lim.is_staff THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO friend_count
  FROM public.friend_requests
  WHERE status = 'accepted'
    AND (sender_id = NEW.sender_id OR receiver_id = NEW.sender_id);
  IF friend_count >= lim.max_friends THEN
    RAISE EXCEPTION 'Has alcanzado el límite de % amigos de tu membresía.', lim.max_friends;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_friend_limits ON public.friend_requests;
CREATE TRIGGER trg_enforce_friend_limits
BEFORE INSERT ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_friend_limits();