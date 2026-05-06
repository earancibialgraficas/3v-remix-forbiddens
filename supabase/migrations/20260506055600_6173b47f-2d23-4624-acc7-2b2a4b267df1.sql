CREATE OR REPLACE FUNCTION public.forum_post_route(p_post_id uuid, p_comment_id uuid DEFAULT NULL::uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_category text;
  base_path text := '/gaming-anime/foro';
BEGIN
  IF p_post_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT category INTO post_category
  FROM public.posts
  WHERE id = p_post_id
  LIMIT 1;

  base_path := CASE post_category
    WHEN 'gaming-anime-foro' THEN '/gaming-anime/foro'
    WHEN 'gaming-anime-anime' THEN '/gaming-anime/anime'
    WHEN 'gaming-anime-gaming' THEN '/gaming-anime/gaming'
    WHEN 'arcade-consejos' THEN '/arcade/consejos'
    WHEN 'gaming-anime-creador' THEN '/gaming-anime/creador'
    WHEN 'motociclismo-riders' THEN '/motociclismo/riders'
    WHEN 'motociclismo-taller' THEN '/motociclismo/taller'
    WHEN 'motociclismo-rutas' THEN '/motociclismo/rutas'
    WHEN 'mercado-gaming' THEN '/mercado/gaming'
    WHEN 'mercado-motor' THEN '/mercado/motor'
    ELSE '/gaming-anime/foro'
  END;

  RETURN base_path || '?post=' || p_post_id::text || COALESCE('&comment=' || p_comment_id::text, '');
END;
$function$;

CREATE OR REPLACE FUNCTION public.extract_system_link(p_content text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  link_match text[];
BEGIN
  IF p_content IS NULL THEN
    RETURN NULL;
  END IF;

  link_match := regexp_match(p_content, '\[LINK:([^\]]+)\]');
  IF link_match IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN link_match[1];
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_system_staff_message(
  p_title text,
  p_content text,
  p_message_type text DEFAULT 'system'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_user record;
  bot_id uuid := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105'::uuid;
  target_url text := public.extract_system_link(p_content);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  FOR staff_user IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.user_id IS NOT NULL
      AND (
        (
          p_message_type = 'report'
          AND ur.role IN ('master_web', 'admin', 'moderator')
        )
        OR (
          p_message_type <> 'report'
          AND ur.role IN ('master_web', 'admin')
        )
      )
  LOOP
    INSERT INTO public.inbox_messages (sender_id, receiver_id, content, message_type, channel)
    VALUES (bot_id, staff_user.user_id, p_content, p_message_type, 'staff');

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (staff_user.user_id, p_message_type, p_title, LEFT(p_content, 200), target_url);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_system_admin_message(
  p_title text,
  p_content text,
  p_message_type text DEFAULT 'system'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_user record;
  bot_id uuid := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105'::uuid;
  target_url text := public.extract_system_link(p_content);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  FOR staff_user IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.user_id IS NOT NULL
      AND ur.role IN ('master_web', 'admin')
  LOOP
    INSERT INTO public.inbox_messages (sender_id, receiver_id, content, message_type, channel)
    VALUES (bot_id, staff_user.user_id, p_content, p_message_type, 'staff');

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (staff_user.user_id, p_message_type, p_title, LEFT(p_content, 200), target_url);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_staff_report(
  p_reporter_id uuid,
  p_reported_user_id uuid,
  p_reason text,
  p_details text,
  p_post_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_user record;
  reporter_name text;
  bot_id uuid := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105'::uuid;
  target_url text;
  ticket_content text;
BEGIN
  INSERT INTO public.reports (reporter_id, reported_user_id, reason, post_id)
  VALUES (p_reporter_id, p_reported_user_id, p_reason, p_post_id);

  SELECT display_name INTO reporter_name
  FROM public.profiles
  WHERE user_id = p_reporter_id
  LIMIT 1;

  target_url := COALESCE(public.forum_post_route(p_post_id), '/usuario/' || p_reported_user_id::text);
  ticket_content := '⚠️ REPORTE de ' || COALESCE(reporter_name, 'Anónimo') || ': ' || p_reason ||
    CASE WHEN COALESCE(p_details, '') <> '' THEN ' — ' || p_details ELSE '' END ||
    E'\n\n[LINK:' || target_url || ']Ver contenido reportado[/LINK]';

  FOR staff_user IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('master_web', 'admin', 'moderator')
  LOOP
    INSERT INTO public.inbox_messages (sender_id, receiver_id, content, message_type, channel)
    VALUES (bot_id, staff_user.user_id, ticket_content, 'report', 'staff');

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (staff_user.user_id, 'report', 'Nuevo reporte', COALESCE(reporter_name, 'Anónimo') || ' reportó a un usuario: ' || p_reason, target_url);
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.forum_post_route(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_post_route(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.extract_system_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extract_system_link(text) TO authenticated;

REVOKE ALL ON FUNCTION public.send_system_staff_message(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_system_staff_message(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.send_system_admin_message(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_system_admin_message(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.send_staff_report(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_staff_report(uuid, uuid, text, text, uuid) TO authenticated;