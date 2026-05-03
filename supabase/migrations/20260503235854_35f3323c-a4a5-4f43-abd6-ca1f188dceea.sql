CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id::text = _user_id::text
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.send_system_admin_message(
  p_title text,
  p_content text,
  p_message_type text DEFAULT 'system'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  staff_user record;
  bot_id uuid := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105'::uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  FOR staff_user IN
    SELECT DISTINCT ur.user_id::uuid AS user_id
    FROM public.user_roles ur
    WHERE ur.user_id IS NOT NULL
      AND ur.role IN ('master_web'::public.app_role, 'admin'::public.app_role)
  LOOP
    INSERT INTO public.inbox_messages (sender_id, receiver_id, content, message_type, channel)
    VALUES (bot_id, staff_user.user_id, p_content, p_message_type, 'staff');

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (staff_user.user_id, p_message_type, p_title, LEFT(p_content, 200), NULL);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Users can see own suggestions" ON public.game_suggestions;
DROP POLICY IF EXISTS "Staff can update suggestions" ON public.game_suggestions;

CREATE POLICY "Users can see own suggestions"
ON public.game_suggestions
FOR SELECT
USING (
  auth.uid()::text = user_id::text
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'master_web'::public.app_role)
);

CREATE POLICY "Staff can update suggestions"
ON public.game_suggestions
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'master_web'::public.app_role)
);

DROP POLICY IF EXISTS "Users can view own suggestions" ON public.tip_suggestions;
DROP POLICY IF EXISTS "Admins can update suggestions" ON public.tip_suggestions;

CREATE POLICY "Users can view own suggestions"
ON public.tip_suggestions
FOR SELECT
USING (
  auth.uid()::text = user_id::text
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'master_web'::public.app_role)
);

CREATE POLICY "Admins can update suggestions"
ON public.tip_suggestions
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'master_web'::public.app_role)
);