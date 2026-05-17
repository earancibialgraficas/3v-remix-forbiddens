-- Multiplayer arcade win rewards.
-- Awards points to the authenticated player who won a browser multiplayer match.
-- Client-side games are lightweight, so this RPC keeps rewards modest and capped.

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
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'not_authenticated');
  END IF;

  IF p_game_slug IS NULL OR btrim(p_game_slug) = '' THEN
    RETURN json_build_object('awarded', 0, 'reason', 'missing_game');
  END IF;

  IF p_game_slug NOT IN ('pong', 'agar', 'tic-tac-toe', 'card-duel') THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_game');
  END IF;

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

  UPDATE public.profiles
  SET total_score = COALESCE(total_score, 0) + awarded,
      updated_at = now()
  WHERE user_id = uid
  RETURNING total_score INTO profile_total;

  RETURN json_build_object(
    'awarded', awarded,
    'reason', 'ok',
    'game', p_game_slug,
    'room', p_room_code,
    'total_score', COALESCE(profile_total, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) TO authenticated;
