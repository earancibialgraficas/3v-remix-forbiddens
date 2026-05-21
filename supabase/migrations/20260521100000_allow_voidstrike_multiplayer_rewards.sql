-- Permite que Voidstrike use el sistema de puntos STAT, boosters y leaderboard multiplayer.

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
  uid_text text := auth.uid()::text;
  base_awarded integer := GREATEST(COALESCE(p_points, 25), 0);
  active_multiplier integer := 1;
  awarded integer := 0;
  profile_total bigint := 0;
  player_name text := 'Anonimo';
  leaderboard_id text;
  leaderboard_score bigint := 0;
  display_game_name text;
  save_step text := 'start';
  point_event_error text;
  profile_error text;
  point_event_saved boolean := false;
  profile_saved boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'not_authenticated');
  END IF;

  IF p_game_slug IS NULL OR btrim(p_game_slug) = '' THEN
    RETURN json_build_object('awarded', 0, 'reason', 'missing_game');
  END IF;

  IF base_awarded <= 0 THEN
    RETURN json_build_object('awarded', 0, 'reason', 'no_points');
  END IF;

  IF p_game_slug NOT IN (
    'pong', 'agar', 'voidstrike', 'tic-tac-toe', 'card-duel', 'chess', 'massive-decks', 'watch-together',
    'casino-roulette', 'casino-blackjack', 'casino-chess', 'casino-horses', 'casino-bingo'
  ) THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_game');
  END IF;

  save_step := 'active_multiplier';
  SELECT COALESCE(MAX(multiplier), 1)
  INTO active_multiplier
  FROM public.active_account_boosters
  WHERE user_id = uid_text
    AND item_slug = 'points_x3_week'
    AND starts_at <= now()
    AND ends_at > now();

  awarded := base_awarded * GREATEST(COALESCE(active_multiplier, 1), 1);

  display_game_name := CASE p_game_slug
    WHEN 'pong' THEN 'Pong / Air Hockey'
    WHEN 'agar' THEN 'Agar.io Clon'
    WHEN 'voidstrike' THEN 'Voidstrike'
    WHEN 'tic-tac-toe' THEN 'Tic Tac Toe'
    WHEN 'card-duel' THEN 'Card Duel'
    WHEN 'chess' THEN 'Ajedrez Arcade'
    WHEN 'massive-decks' THEN 'Massive Decks'
    WHEN 'watch-together' THEN 'Watch Together'
    WHEN 'casino-roulette' THEN 'Ruleta Retro'
    WHEN 'casino-blackjack' THEN 'Blackjack Drag'
    WHEN 'casino-chess' THEN 'Ajedrez con Apuesta'
    WHEN 'casino-horses' THEN 'Carrera de Caballos'
    WHEN 'casino-bingo' THEN 'Bingo Arcade'
    ELSE p_game_slug
  END;

  save_step := 'load_profile';
  SELECT COALESCE(display_name, 'Anonimo')
  INTO player_name
  FROM public.profiles
  WHERE user_id::text = uid_text
  LIMIT 1;

  save_step := 'insert_point_event';
  BEGIN
    EXECUTE format(
      'INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
       VALUES (%L, %L, %L, gen_random_uuid(), %s)',
      uid_text,
      uid_text,
      'multiplayer_win',
      awarded
    );
    point_event_saved := true;
  EXCEPTION WHEN OTHERS THEN
    point_event_error := SQLERRM;
  END;

  save_step := 'select_leaderboard';
  SELECT id::text, score
  INTO leaderboard_id, leaderboard_score
  FROM public.leaderboard_scores
  WHERE user_id::text = uid_text
    AND game_name = display_game_name
    AND console_type = 'multiplayer'
  ORDER BY score DESC, updated_at DESC
  LIMIT 1;

  IF leaderboard_id IS NULL THEN
    save_step := 'insert_leaderboard';
    leaderboard_score := awarded;
    EXECUTE format(
      'INSERT INTO public.leaderboard_scores (user_id, display_name, game_name, console_type, score, play_time_seconds)
       VALUES (%L, %L, %L, %L, %s, 0)
       RETURNING id::text',
      uid_text,
      COALESCE(player_name, 'Anonimo'),
      display_game_name,
      'multiplayer',
      leaderboard_score
    )
    INTO leaderboard_id;
  ELSE
    save_step := 'update_leaderboard';
    leaderboard_score := COALESCE(leaderboard_score, 0) + awarded;
    UPDATE public.leaderboard_scores
    SET score = leaderboard_score,
        display_name = COALESCE(player_name, display_name),
        updated_at = now()
    WHERE id::text = leaderboard_id;
  END IF;

  save_step := 'update_profile_total';
  BEGIN
    UPDATE public.profiles
    SET total_score = COALESCE(total_score, 0) + awarded,
        updated_at = now()
    WHERE user_id::text = uid_text
    RETURNING total_score INTO profile_total;
    profile_saved := true;
  EXCEPTION WHEN OTHERS THEN
    profile_error := SQLERRM;
  END;

  RETURN json_build_object(
    'awarded', awarded,
    'base_awarded', base_awarded,
    'multiplier', GREATEST(COALESCE(active_multiplier, 1), 1),
    'reason', 'ok',
    'game', p_game_slug,
    'game_name', display_game_name,
    'room', p_room_code,
    'leaderboard_score', COALESCE(leaderboard_score, 0),
    'total_score', COALESCE(profile_total, 0),
    'point_event_saved', point_event_saved,
    'point_event_error', point_event_error,
    'profile_saved', profile_saved,
    'profile_error', profile_error
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'awarded', 0,
    'reason', 'sql_error',
    'step', save_step,
    'message', SQLERRM,
    'detail', SQLSTATE,
    'game', p_game_slug,
    'room', p_room_code
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_multiplayer_win(text, text, integer) TO authenticated;
