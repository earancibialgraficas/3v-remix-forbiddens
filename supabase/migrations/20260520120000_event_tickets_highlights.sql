-- Eventos destacados y entradas comprables con F-coin.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS highlight_until timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_price_fcoins bigint NOT NULL DEFAULT 0 CHECK (ticket_price_fcoins >= 0);

CREATE OR REPLACE FUNCTION public.purchase_event_ticket(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  ev record;
  current_wallet bigint;
  next_wallet bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, title, event_date, event_time, ticket_price_fcoins
  INTO ev
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF ev.id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'event_not_found');
  END IF;

  IF COALESCE(ev.ticket_price_fcoins, 0) <= 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'event_has_no_ticket_price');
  END IF;

  current_wallet := public.ensure_point_wallet(uid);
  IF current_wallet < ev.ticket_price_fcoins THEN
    RETURN json_build_object(
      'ok', false,
      'reason', 'insufficient_fcoins',
      'wallet_balance', current_wallet,
      'ticket_price', ev.ticket_price_fcoins
    );
  END IF;

  UPDATE public.point_wallets
  SET balance = balance - ev.ticket_price_fcoins,
      updated_at = now()
  WHERE user_id = uid
  RETURNING balance INTO next_wallet;

  INSERT INTO public.user_inventory (user_id, item_slug, item_name, quantity, expires_at, metadata)
  VALUES (
    uid,
    'event_ticket:' || ev.id::text,
    'Entrada: ' || ev.title,
    1,
    CASE
      WHEN ev.event_date IS NULL THEN NULL
      ELSE (ev.event_date::timestamp + interval '1 day')::timestamptz
    END,
    jsonb_build_object(
      'source', 'event_ticket',
      'event_id', ev.id,
      'event_title', ev.title,
      'event_date', ev.event_date,
      'event_time', ev.event_time,
      'price_fcoins', ev.ticket_price_fcoins
    )
  );

  RETURN json_build_object(
    'ok', true,
    'event_id', ev.id,
    'ticket_name', 'Entrada: ' || ev.title,
    'price', ev.ticket_price_fcoins,
    'wallet_balance', COALESCE(next_wallet, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_event_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_event_ticket(uuid) TO authenticated;
