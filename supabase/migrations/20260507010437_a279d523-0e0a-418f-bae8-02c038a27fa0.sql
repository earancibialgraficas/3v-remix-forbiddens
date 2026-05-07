-- 1) Promover a TODOS los staff actuales al tier máximo
UPDATE public.profiles
SET membership_tier = 'creador de contenido'
WHERE user_id IN (
  SELECT DISTINCT user_id FROM public.user_roles
  WHERE role IN ('master_web', 'admin', 'moderator')
);

-- 2) Trigger: cuando un usuario reciba un rol de staff, auto-promover su tier
CREATE OR REPLACE FUNCTION public.promote_staff_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('master_web', 'admin', 'moderator') THEN
    UPDATE public.profiles
    SET membership_tier = 'creador de contenido'
    WHERE user_id = NEW.user_id
      AND COALESCE(membership_tier, 'novato') <> 'creador de contenido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_promote_staff_membership ON public.user_roles;
CREATE TRIGGER auto_promote_staff_membership
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.promote_staff_membership();