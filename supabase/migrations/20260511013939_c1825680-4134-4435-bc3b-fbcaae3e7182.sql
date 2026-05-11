
-- =====================================================
-- TANDA 3 / ITEM 1: Sistema de puntos bonus
-- =====================================================

-- 1) Tabla de eventos de puntos (idempotente por dedupe keys)
CREATE TABLE IF NOT EXISTS public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                 -- quien RECIBE los puntos (autor)
  actor_id uuid,                         -- quien dispara (viewer); NULL si es self-action (subida)
  source_type text NOT NULL,             -- 'video_upload' | 'video_watch_30s' | 'photo_view'
  source_id uuid NOT NULL,               -- id del video/foto
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dedupe: un evento por (tipo, recurso, actor)
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_events_with_actor
  ON public.point_events (source_type, source_id, actor_id)
  WHERE actor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_events_no_actor
  ON public.point_events (source_type, source_id)
  WHERE actor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_point_events_user_day
  ON public.point_events (user_id, created_at DESC);

-- 2) RLS: solo lectura propia/staff. Inserciones vía función SECURITY DEFINER.
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own point events" ON public.point_events;
CREATE POLICY "Users can view their own point events"
  ON public.point_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- 3) Función para otorgar puntos con tope diario y dedupe
CREATE OR REPLACE FUNCTION public.award_bonus_points(
  p_recipient uuid,
  p_actor uuid,
  p_source_type text,
  p_source_id uuid,
  p_points integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_cap constant integer := 2000;
  awarded integer := 0;
  today_sum integer := 0;
  effective integer := p_points;
BEGIN
  IF p_recipient IS NULL OR p_source_id IS NULL OR p_source_type IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'missing_args');
  END IF;

  -- No self-points
  IF p_actor IS NOT NULL AND p_actor = p_recipient THEN
    RETURN json_build_object('awarded', 0, 'reason', 'self_action');
  END IF;

  -- Validar tipos permitidos
  IF p_source_type NOT IN ('video_upload', 'video_watch_30s', 'photo_view') THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_source_type');
  END IF;

  -- Tope diario
  SELECT COALESCE(SUM(points), 0) INTO today_sum
  FROM public.point_events
  WHERE user_id = p_recipient
    AND created_at >= date_trunc('day', now());

  IF today_sum >= daily_cap THEN
    RETURN json_build_object('awarded', 0, 'reason', 'daily_cap_reached');
  END IF;

  effective := LEAST(p_points, GREATEST(0, daily_cap - today_sum));
  IF effective <= 0 THEN
    RETURN json_build_object('awarded', 0, 'reason', 'cap_clipped_to_zero');
  END IF;

  -- Insert con ON CONFLICT DO NOTHING (dedupe por índice parcial)
  BEGIN
    INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
    VALUES (p_recipient, p_actor, p_source_type, p_source_id, effective);
    awarded := effective;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('awarded', 0, 'reason', 'already_awarded');
  END;

  -- Sumar al total_score del autor
  IF awarded > 0 THEN
    UPDATE public.profiles
    SET total_score = COALESCE(total_score, 0) + awarded
    WHERE user_id = p_recipient;
  END IF;

  RETURN json_build_object('awarded', awarded, 'reason', 'ok');
END;
$$;

-- 4) Actualizar recalculate_total_score para incluir bonus
CREATE OR REPLACE FUNCTION public.recalculate_total_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  arcade_sum integer;
  bonus_sum integer;
BEGIN
  SELECT COALESCE(SUM(best), 0) INTO arcade_sum
  FROM (
    SELECT MAX(score) AS best
    FROM public.leaderboard_scores
    WHERE user_id = p_user_id
    GROUP BY game_name, console_type
  ) sub;

  SELECT COALESCE(SUM(points), 0) INTO bonus_sum
  FROM public.point_events
  WHERE user_id = p_user_id;

  UPDATE public.profiles
  SET total_score = arcade_sum + bonus_sum
  WHERE user_id = p_user_id;
END;
$$;
