-- Repair multiplayer point saving on databases where user_id columns drifted
-- between uuid and text. This replaces the RPC, the recalc trigger function,
-- and the most relevant RLS policies with text-safe comparisons.

ALTER TABLE public.leaderboard_scores
  DROP CONSTRAINT IF EXISTS leaderboard_scores_console_type_check;

ALTER TABLE public.leaderboard_scores
  ADD CONSTRAINT leaderboard_scores_console_type_check
  CHECK (console_type IN ('nes', 'snes', 'gba', 'gb', 'gbc', 'n64', 'sega', 'megadrive', 'ps1', 'psx', 'ps2', 'ds', 'arcade', 'multiplayer'))
  NOT VALID;

-- Keep global role helpers text-safe too. Some RLS policies call is_staff(),
-- and older versions compared user_roles.user_id directly to a uuid.
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

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'master_web'::public.app_role)
      OR public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'moderator'::public.app_role)
$$;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own scores" ON public.leaderboard_scores;
CREATE POLICY "Users can insert their own scores"
ON public.leaderboard_scores
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own scores" ON public.leaderboard_scores;
CREATE POLICY "Users can update their own scores"
ON public.leaderboard_scores
FOR UPDATE
USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can view their own point events" ON public.point_events;
CREATE POLICY "Users can view their own point events"
ON public.point_events
FOR SELECT
USING (auth.uid()::text = user_id::text OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.award_multiplayer_win(
  p_game_slug text,
  p_room_code text,
  p_points integer DEFAULT 25
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uid_text text := auth.uid()::text;
  awarded integer := GREATEST(COALESCE(p_points, 25), 0);
  profile_total integer := 0;
  player_name text := 'Anonimo';
  leaderboard_id uuid;
  leaderboard_score integer := 0;
  display_game_name text;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'not_authenticated');
  END IF;

  IF p_game_slug IS NULL OR btrim(p_game_slug) = '' THEN
    RETURN json_build_object('awarded', 0, 'reason', 'missing_game');
  END IF;

  IF awarded <= 0 THEN
    RETURN json_build_object('awarded', 0, 'reason', 'no_points');
  END IF;

  IF p_game_slug NOT IN ('pong', 'agar', 'tic-tac-toe', 'card-duel', 'chess', 'massive-decks') THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_game');
  END IF;

  display_game_name := CASE p_game_slug
    WHEN 'pong' THEN 'Pong / Air Hockey'
    WHEN 'agar' THEN 'Agar.io-like'
    WHEN 'tic-tac-toe' THEN 'Tic Tac Toe'
    WHEN 'card-duel' THEN 'Card Duel'
    WHEN 'chess' THEN 'Ajedrez Arcade'
    WHEN 'massive-decks' THEN 'Massive Decks'
    ELSE p_game_slug
  END;

  SELECT COALESCE(display_name, 'Anonimo')
  INTO player_name
  FROM public.profiles
  WHERE user_id::text = uid_text
  LIMIT 1;

  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid, uid, 'multiplayer_win', gen_random_uuid(), awarded);

  SELECT id, score
  INTO leaderboard_id, leaderboard_score
  FROM public.leaderboard_scores
  WHERE user_id::text = uid_text
    AND game_name = display_game_name
    AND console_type = 'multiplayer'
  ORDER BY score DESC, updated_at DESC
  LIMIT 1;

  IF leaderboard_id IS NULL THEN
    leaderboard_score := awarded;
    INSERT INTO public.leaderboard_scores (
      user_id,
      display_name,
      game_name,
      console_type,
      score,
      play_time_seconds
    ) VALUES (
      uid,
      COALESCE(player_name, 'Anonimo'),
      display_game_name,
      'multiplayer',
      leaderboard_score,
      0
    )
    RETURNING id INTO leaderboard_id;
  ELSE
    leaderboard_score := COALESCE(leaderboard_score, 0) + awarded;
    UPDATE public.leaderboard_scores
    SET score = leaderboard_score,
        display_name = COALESCE(player_name, display_name),
        updated_at = now()
    WHERE id = leaderboard_id;
  END IF;

  UPDATE public.profiles
  SET total_score = COALESCE(total_score, 0) + awarded,
      updated_at = now()
  WHERE user_id::text = uid_text
  RETURNING total_score INTO profile_total;

  RETURN json_build_object(
    'awarded', awarded,
    'reason', 'ok',
    'game', p_game_slug,
    'game_name', display_game_name,
    'room', p_room_code,
    'leaderboard_score', COALESCE(leaderboard_score, 0),
    'total_score', COALESCE(profile_total, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_total_score(p_user_id text)
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
    WHERE user_id::text = p_user_id
      AND console_type <> 'multiplayer'
    GROUP BY game_name, console_type
  ) sub;

  SELECT COALESCE(SUM(points), 0) INTO bonus_sum
  FROM public.point_events
  WHERE user_id::text = p_user_id;

  UPDATE public.profiles
  SET total_score = arcade_sum + bonus_sum,
      updated_at = now()
  WHERE user_id::text = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_total_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_total_score(p_user_id::text);
END;
$$;

DROP TRIGGER IF EXISTS recalc_total_score_after_upsert ON public.leaderboard_scores;
DROP TRIGGER IF EXISTS recalc_total_score_on_insert ON public.leaderboard_scores;
DROP TRIGGER IF EXISTS recalc_total_score_on_update ON public.leaderboard_scores;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_total_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_total_score(NEW.user_id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_total_score_after_upsert
AFTER INSERT OR UPDATE ON public.leaderboard_scores
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_total_score();

REVOKE EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) TO authenticated;
