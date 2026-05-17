-- Allow Massive Decks to use the same multiplayer reward pipeline as the
-- built-in browser multiplayer games.

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
  awarded integer := LEAST(GREATEST(COALESCE(p_points, 25), 1), 25);
  today_sum integer := 0;
  daily_cap integer := 500;
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

  IF p_game_slug NOT IN ('pong', 'agar', 'tic-tac-toe', 'card-duel', 'chess', 'mala-junta', 'massive-decks') THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_game');
  END IF;

  display_game_name := CASE p_game_slug
    WHEN 'pong' THEN 'Pong / Air Hockey'
    WHEN 'agar' THEN 'Agar.io-like'
    WHEN 'tic-tac-toe' THEN 'Tic Tac Toe'
    WHEN 'card-duel' THEN 'Card Duel'
    WHEN 'chess' THEN 'Ajedrez Arcade'
    WHEN 'mala-junta' THEN 'Mala Junta'
    WHEN 'massive-decks' THEN 'Massive Decks'
    ELSE p_game_slug
  END;

  SELECT COALESCE(display_name, 'Anonimo')
  INTO player_name
  FROM public.profiles
  WHERE user_id = uid
  LIMIT 1;

  SELECT COALESCE(SUM(points), 0)
  INTO today_sum
  FROM public.point_events
  WHERE user_id = uid
    AND source_type = 'multiplayer_win'
    AND created_at >= date_trunc('day', now());

  IF today_sum >= daily_cap THEN
    RETURN json_build_object('awarded', 0, 'reason', 'daily_cap_reached');
  END IF;

  awarded := LEAST(awarded, daily_cap - today_sum);

  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid, uid, 'multiplayer_win', gen_random_uuid(), awarded);

  SELECT id, score
  INTO leaderboard_id, leaderboard_score
  FROM public.leaderboard_scores
  WHERE user_id = uid
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
  WHERE user_id = uid
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

REVOKE EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) TO authenticated;
