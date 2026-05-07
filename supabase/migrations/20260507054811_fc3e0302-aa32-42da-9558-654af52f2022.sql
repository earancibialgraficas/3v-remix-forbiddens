-- ============================================================
-- Compatibilidad: límites por membresía cuando el user_id llega como text
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_membership_limits(_user_id text)
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
  staff boolean := false;
  uid uuid;
BEGIN
  BEGIN
    uid := NULLIF(_user_id, '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    uid := NULL;
  END;

  IF uid IS NOT NULL THEN
    staff := public.has_role(uid, 'master_web'::app_role)
          OR public.has_role(uid, 'admin'::app_role)
          OR public.has_role(uid, 'moderator'::app_role);
  END IF;

  SELECT LOWER(COALESCE(membership_tier, 'novato')) INTO tier
  FROM public.profiles
  WHERE user_id::text = _user_id
  LIMIT 1;

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
-- Reescritura defensiva de triggers de mensajes
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
  SELECT * INTO lim FROM public.get_membership_limits(NEW.sender_id::text);
  IF lim.is_staff THEN RETURN NEW; END IF;
  IF char_length(COALESCE(NEW.content, '')) > lim.max_dm_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres por mensaje privado.', lim.max_dm_chars;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_inbox_message_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim record;
  bot_id text := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105';
BEGIN
  IF NEW.sender_id::text = bot_id THEN RETURN NEW; END IF;

  SELECT * INTO lim FROM public.get_membership_limits(NEW.sender_id::text);
  IF lim.is_staff THEN RETURN NEW; END IF;
  IF char_length(COALESCE(NEW.content, '')) > lim.max_dm_chars THEN
    RAISE EXCEPTION 'Tu membresía permite hasta % caracteres por mensaje.', lim.max_dm_chars;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_private_message_limits ON public.private_messages;
CREATE TRIGGER trg_enforce_private_message_limits
BEFORE INSERT OR UPDATE ON public.private_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_private_message_limits();

DROP TRIGGER IF EXISTS trg_enforce_inbox_message_limits ON public.inbox_messages;
CREATE TRIGGER trg_enforce_inbox_message_limits
BEFORE INSERT OR UPDATE ON public.inbox_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_inbox_message_limits();

-- ============================================================
-- Funciones seguras para gestión de roles con jerarquía
-- ============================================================
CREATE OR REPLACE FUNCTION public.manage_user_role(p_target_user_id uuid, p_role app_role, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_master boolean;
  actor_is_admin boolean;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  actor_is_master := public.has_role(actor_id, 'master_web'::app_role);
  actor_is_admin := public.has_role(actor_id, 'admin'::app_role);

  IF p_role = 'master_web'::app_role THEN
    RAISE EXCEPTION 'El rol Master Web no se gestiona desde este panel.';
  END IF;

  IF p_role = 'admin'::app_role AND NOT actor_is_master THEN
    RAISE EXCEPTION 'Solo Master Web puede gestionar administradores.';
  END IF;

  IF p_role = 'moderator'::app_role AND NOT (actor_is_master OR actor_is_admin) THEN
    RAISE EXCEPTION 'Solo Master Web o administradores pueden gestionar moderadores.';
  END IF;

  IF p_action = 'grant' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF p_action = 'revoke' THEN
    DELETE FROM public.user_roles
    WHERE user_id = p_target_user_id
      AND role = p_role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Acción de rol inválida.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_user_by_email(email_query text)
RETURNS TABLE(user_id uuid, display_name text, membership_tier text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.membership_tier
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(u.email) = lower(email_query)
    AND (
      auth.uid() = p.user_id
      OR public.has_role(auth.uid(), 'master_web'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.get_membership_limits(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_membership_limits(text) TO authenticated;

REVOKE ALL ON FUNCTION public.manage_user_role(uuid, app_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_user_role(uuid, app_role, text) TO authenticated;

REVOKE ALL ON FUNCTION public.search_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_user_by_email(text) TO authenticated;