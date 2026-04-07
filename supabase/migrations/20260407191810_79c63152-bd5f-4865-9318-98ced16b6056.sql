CREATE TRIGGER recalc_total_score_on_insert
AFTER INSERT ON public.leaderboard_scores
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_total_score();

CREATE TRIGGER recalc_total_score_on_update
AFTER UPDATE ON public.leaderboard_scores
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_total_score();