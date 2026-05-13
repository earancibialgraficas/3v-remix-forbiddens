-- 1. Columna de expiración de membresía
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

-- 2. Canjear Lite con 100k pts
CREATE OR REPLACE FUNCTION public.claim_lite_membership()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  current_score int;
  staff boolean;
  new_expires timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;
  staff := public.is_staff(uid);
  IF staff THEN
    RAISE EXCEPTION 'El staff no necesita canjear membresías.';
  END IF;

  SELECT COALESCE(total_score, 0) INTO current_score
  FROM public.profiles WHERE user_id = uid;

  IF current_score < 100000 THEN
    RAISE EXCEPTION 'Necesitas 100.000 puntos para canjear Lite (tienes %).', current_score;
  END IF;

  new_expires := now() + interval '30 days';

  -- Registrar el gasto como evento negativo
  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid, uid, 'lite_claim', gen_random_uuid(), -100000);

  UPDATE public.profiles
  SET membership_tier = 'lite',
      membership_expires_at = new_expires,
      total_score = GREATEST(0, COALESCE(total_score, 0) - 100000)
  WHERE user_id = uid;

  RETURN json_build_object('ok', true, 'expires_at', new_expires);
END;
$$;

-- 3. Expirar membresías globalmente (uso administrativo / cron opcional)
CREATE OR REPLACE FUNCTION public.expire_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  WITH upd AS (
    UPDATE public.profiles
    SET membership_tier = 'novato',
        membership_expires_at = NULL
    WHERE membership_expires_at IS NOT NULL
      AND membership_expires_at < now()
      AND NOT public.is_staff(user_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO affected FROM upd;
  RETURN affected;
END;
$$;

-- 4. Expirar membresía del usuario actual (llamada desde el cliente al cargar perfil)
CREATE OR REPLACE FUNCTION public.auto_expire_user_membership()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  exp timestamptz;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.is_staff(uid) THEN RETURN false; END IF;

  SELECT membership_expires_at INTO exp
  FROM public.profiles WHERE user_id = uid;

  IF exp IS NOT NULL AND exp < now() THEN
    UPDATE public.profiles
    SET membership_tier = 'novato',
        membership_expires_at = NULL
    WHERE user_id = uid;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;