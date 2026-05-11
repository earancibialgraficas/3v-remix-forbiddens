
-- Ampliar source_types permitidos
CREATE OR REPLACE FUNCTION public.award_bonus_points(
  p_recipient uuid, p_actor uuid, p_source_type text, p_source_id uuid, p_points integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  daily_cap constant integer := 2000;
  awarded integer := 0;
  today_sum integer := 0;
  effective integer := p_points;
BEGIN
  IF p_recipient IS NULL OR p_source_id IS NULL OR p_source_type IS NULL THEN
    RETURN json_build_object('awarded', 0, 'reason', 'missing_args'); END IF;
  IF p_actor IS NOT NULL AND p_actor = p_recipient THEN
    RETURN json_build_object('awarded', 0, 'reason', 'self_action'); END IF;
  IF p_source_type NOT IN ('video_upload', 'video_watch_30s', 'photo_view', 'photo_view_actor', 'like_received') THEN
    RETURN json_build_object('awarded', 0, 'reason', 'invalid_source_type'); END IF;
  SELECT COALESCE(SUM(points), 0) INTO today_sum FROM public.point_events
    WHERE user_id = p_recipient AND created_at >= date_trunc('day', now());
  IF today_sum >= daily_cap THEN
    RETURN json_build_object('awarded', 0, 'reason', 'daily_cap_reached'); END IF;
  effective := LEAST(p_points, GREATEST(0, daily_cap - today_sum));
  IF effective <= 0 THEN
    RETURN json_build_object('awarded', 0, 'reason', 'cap_clipped_to_zero'); END IF;
  BEGIN
    INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
    VALUES (p_recipient, p_actor, p_source_type, p_source_id, effective);
    awarded := effective;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('awarded', 0, 'reason', 'already_awarded');
  END;
  IF awarded > 0 THEN
    UPDATE public.profiles SET total_score = COALESCE(total_score, 0) + awarded
      WHERE user_id = p_recipient;
  END IF;
  RETURN json_build_object('awarded', awarded, 'reason', 'ok');
END; $$;

-- toggle_social_reaction ahora otorga +2 pts al autor cuando recibe un nuevo "like"
CREATE OR REPLACE FUNCTION public.toggle_social_reaction(
  p_target_type text, p_target_id uuid, p_user_id uuid, p_reaction_type text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing record;
  new_likes integer;
  new_dislikes integer;
  user_reaction text;
  content_owner uuid;
BEGIN
  SELECT * INTO existing FROM social_reactions
    WHERE user_id = p_user_id AND target_type = p_target_type AND target_id = p_target_id
    FOR UPDATE;

  IF existing IS NOT NULL THEN
    IF existing.reaction_type = p_reaction_type THEN
      DELETE FROM social_reactions WHERE id = existing.id;
      user_reaction := NULL;
    ELSE
      UPDATE social_reactions SET reaction_type = p_reaction_type WHERE id = existing.id;
      user_reaction := p_reaction_type;
    END IF;
  ELSE
    INSERT INTO social_reactions (user_id, target_type, target_id, reaction_type)
    VALUES (p_user_id, p_target_type, p_target_id, p_reaction_type);
    user_reaction := p_reaction_type;
  END IF;

  SELECT COUNT(*) FILTER (WHERE reaction_type='like'), COUNT(*) FILTER (WHERE reaction_type='dislike')
    INTO new_likes, new_dislikes
    FROM social_reactions WHERE target_type = p_target_type AND target_id = p_target_id;

  IF p_target_type = 'social_content' THEN
    UPDATE social_content SET likes = new_likes, dislikes = new_dislikes WHERE id = p_target_id;
    SELECT user_id INTO content_owner FROM social_content WHERE id = p_target_id;
  ELSIF p_target_type = 'photo' THEN
    UPDATE photos SET likes = new_likes, dislikes = new_dislikes WHERE id = p_target_id;
    SELECT user_id INTO content_owner FROM photos WHERE id = p_target_id;
  END IF;

  -- 🎯 Bonus: +2 pts al autor por like recibido (1 vez por usuario que dio like)
  IF user_reaction = 'like' AND content_owner IS NOT NULL AND content_owner <> p_user_id THEN
    PERFORM public.award_bonus_points(content_owner, p_user_id, 'like_received', p_target_id, 2);
  END IF;

  RETURN json_build_object('likes', new_likes, 'dislikes', new_dislikes, 'user_reaction', user_reaction);
END; $$;
