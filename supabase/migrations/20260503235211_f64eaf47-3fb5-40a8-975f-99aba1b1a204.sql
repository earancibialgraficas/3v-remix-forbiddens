-- Fase 3: Sugerencias solo a admins/master_web (no moderadores). Reportes a admins+mods (sin cambios).

-- 1) Nueva función para enviar sugerencias SOLO a admin / master_web
CREATE OR REPLACE FUNCTION public.send_system_admin_message(p_title text, p_content text, p_message_type text DEFAULT 'system'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_user record;
  bot_id uuid := 'b20cd3e4-ea5e-49ab-9418-fb9c60998105';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  FOR staff_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('master_web', 'admin')
  LOOP
    INSERT INTO public.inbox_messages (sender_id, receiver_id, content, message_type, channel)
    VALUES (bot_id, staff_user.user_id, p_content, p_message_type, 'staff');
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (staff_user.user_id, p_message_type, p_title, LEFT(p_content, 200), NULL);
  END LOOP;
END;
$function$;

-- 2) RLS: excluir moderadores de ver sugerencias
DROP POLICY IF EXISTS "Users can see own suggestions" ON public.game_suggestions;
CREATE POLICY "Users can see own suggestions"
ON public.game_suggestions
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'master_web'::app_role)
);

DROP POLICY IF EXISTS "Users can view own suggestions" ON public.tip_suggestions;
CREATE POLICY "Users can view own suggestions"
ON public.tip_suggestions
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'master_web'::app_role)
);