
-- Function to recalculate total_score for a user (sum of best score per unique game)
CREATE OR REPLACE FUNCTION public.recalculate_total_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed integer;
BEGIN
  SELECT COALESCE(SUM(best), 0) INTO computed
  FROM (
    SELECT MAX(score) AS best
    FROM public.leaderboard_scores
    WHERE user_id = p_user_id
    GROUP BY game_name, console_type
  ) sub;

  UPDATE public.profiles SET total_score = computed WHERE user_id = p_user_id;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.trigger_recalculate_total_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_total_score(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Trigger on leaderboard_scores
CREATE TRIGGER recalc_total_score_after_upsert
AFTER INSERT OR UPDATE ON public.leaderboard_scores
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_total_score();

-- Backfill existing users
DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN SELECT DISTINCT user_id FROM public.leaderboard_scores LOOP
    PERFORM public.recalculate_total_score(uid);
  END LOOP;
END;
$$;
