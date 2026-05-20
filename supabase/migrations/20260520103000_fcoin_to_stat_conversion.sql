CREATE OR REPLACE FUNCTION public.convert_fcoins_to_stat_points(p_points bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid_uuid uuid := auth.uid();
  uid text := auth.uid()::text;
  amount bigint := GREATEST(COALESCE(p_points, 0), 0);
  stat_amount bigint;
  current_wallet bigint;
  next_wallet bigint;
  next_stat bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF amount <= 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  IF amount % 5 <> 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'amount_must_be_multiple_of_5');
  END IF;

  stat_amount := amount / 5;

  current_wallet := public.ensure_point_wallet(uid);
  IF COALESCE(current_wallet, 0) < amount THEN
    RETURN json_build_object('ok', false, 'reason', 'insufficient_fcoins', 'wallet_balance', COALESCE(current_wallet, 0));
  END IF;

  UPDATE public.point_wallets
  SET balance = balance - amount,
      updated_at = now()
  WHERE user_id = uid
  RETURNING balance INTO next_wallet;

  INSERT INTO public.point_events (user_id, actor_id, source_type, source_id, points)
  VALUES (uid_uuid, uid_uuid, 'fcoin_to_stat', gen_random_uuid(), stat_amount);

  UPDATE public.profiles
  SET total_score = COALESCE(total_score, 0) + stat_amount,
      updated_at = now()
  WHERE user_id::text = uid
  RETURNING total_score INTO next_stat;

  RETURN json_build_object(
    'ok', true,
    'converted', amount,
    'stat_awarded', stat_amount,
    'rate', '5_fcoins_1_stat',
    'stat_points', COALESCE(next_stat, 0),
    'wallet_balance', COALESCE(next_wallet, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.convert_fcoins_to_stat_points(bigint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.convert_fcoins_to_stat_points(bigint) TO authenticated;
