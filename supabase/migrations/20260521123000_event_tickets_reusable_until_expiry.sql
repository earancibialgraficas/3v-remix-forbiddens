-- Convierte los boletos de evento en pases reutilizables.
-- Entrar/salir de una sala ya no consume el item; se limpia automaticamente 24h despues del evento.

CREATE OR REPLACE FUNCTION public.event_ticket_expiry(p_event_date date, p_event_time text)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_event_date IS NULL THEN NULL
    ELSE (
      p_event_date::timestamp
      + CASE
          WHEN COALESCE(p_event_time, '') ~ '^\d{1,2}:\d{2}(:\d{2})?$'
            THEN p_event_time::time
          ELSE time '23:59:59'
        END
      + interval '24 hours'
    )::timestamptz
  END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_event_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_count integer := 0;
BEGIN
  WITH expired AS (
    SELECT
      ui.id,
      ui.user_id,
      NULLIF(ui.metadata->>'event_id', '')::uuid AS event_id
    FROM public.user_inventory ui
    WHERE ui.item_slug LIKE 'event_ticket:%'
      AND ui.expires_at IS NOT NULL
      AND ui.expires_at <= now()
  ),
  marked AS (
    UPDATE public.event_ticket_purchases etp
    SET consumed_at = COALESCE(etp.consumed_at, now())
    FROM expired e
    WHERE etp.user_id = e.user_id
      AND etp.event_id = e.event_id
    RETURNING etp.id
  ),
  deleted AS (
    DELETE FROM public.user_inventory ui
    USING expired e
    WHERE ui.id = e.id
    RETURNING ui.id
  )
  SELECT COUNT(*) INTO removed_count FROM deleted;

  RETURN COALESCE(removed_count, 0);
END;
$$;

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
  new_ticket_id uuid;
  ticket_expires_at timestamptz;
BEGIN
  PERFORM public.cleanup_expired_event_tickets();

  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, title, event_date, event_time, ticket_price_fcoins, event_game_slug, event_game_label
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

  ticket_expires_at := public.event_ticket_expiry(ev.event_date, ev.event_time);
  IF ticket_expires_at IS NOT NULL AND ticket_expires_at <= now() THEN
    RETURN json_build_object('ok', false, 'reason', 'event_ticket_expired');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.event_ticket_purchases
    WHERE user_id = uid
      AND event_id = ev.id
      AND consumed_at IS NULL
  ) THEN
    RETURN json_build_object('ok', false, 'reason', 'ticket_already_purchased');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_inventory
    WHERE user_id = uid
      AND item_slug = 'event_ticket:' || ev.id::text
      AND COALESCE(quantity, 0) > 0
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN json_build_object('ok', false, 'reason', 'ticket_already_purchased');
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
    ticket_expires_at,
    jsonb_build_object(
      'source', 'event_ticket',
      'event_id', ev.id,
      'event_title', ev.title,
      'event_date', ev.event_date,
      'event_time', ev.event_time,
      'price_fcoins', ev.ticket_price_fcoins,
      'game_slug', ev.event_game_slug,
      'game_label', ev.event_game_label,
      'access', 'unlimited_until_expiry'
    )
  )
  RETURNING id INTO new_ticket_id;

  INSERT INTO public.event_ticket_purchases (user_id, event_id, ticket_item_id)
  VALUES (uid, ev.id, new_ticket_id)
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET
    ticket_item_id = EXCLUDED.ticket_item_id,
    consumed_at = NULL,
    created_at = now();

  RETURN json_build_object(
    'ok', true,
    'event_id', ev.id,
    'ticket_name', 'Entrada: ' || ev.title,
    'price', ev.ticket_price_fcoins,
    'wallet_balance', COALESCE(next_wallet, 0),
    'expires_at', ticket_expires_at,
    'access', 'unlimited_until_expiry'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_event_ticket_for_room(p_event_id uuid, p_game_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := auth.uid()::text;
  ev record;
  ticket record;
  ticket_expires_at timestamptz;
BEGIN
  PERFORM public.cleanup_expired_event_tickets();

  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, title, event_date, event_time, event_game_slug, created_at
  INTO ev
  FROM public.events
  WHERE id = p_event_id;

  IF ev.id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'event_not_found');
  END IF;

  IF COALESCE(ev.event_game_slug, '') <> COALESCE(p_game_slug, '') THEN
    RETURN json_build_object('ok', false, 'reason', 'wrong_game_for_ticket');
  END IF;

  IF ev.created_at < now() - interval '7 days' THEN
    RETURN json_build_object('ok', false, 'reason', 'event_room_expired');
  END IF;

  ticket_expires_at := public.event_ticket_expiry(ev.event_date, ev.event_time);
  IF ticket_expires_at IS NOT NULL AND ticket_expires_at <= now() THEN
    RETURN json_build_object('ok', false, 'reason', 'event_ticket_expired');
  END IF;

  SELECT id, quantity, expires_at
  INTO ticket
  FROM public.user_inventory
  WHERE user_id = uid
    AND item_slug = 'event_ticket:' || ev.id::text
    AND COALESCE(quantity, 0) > 0
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF ticket.id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'ticket_required');
  END IF;

  UPDATE public.user_inventory
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_used_at', now(), 'last_room_game', p_game_slug),
      updated_at = now()
  WHERE id = ticket.id;

  RETURN json_build_object(
    'ok', true,
    'event_id', ev.id,
    'event_title', ev.title,
    'ticket_id', ticket.id,
    'expires_at', ticket.expires_at,
    'access', 'unlimited_until_expiry'
  );
END;
$$;

UPDATE public.user_inventory ui
SET expires_at = public.event_ticket_expiry(e.event_date, e.event_time),
    metadata = COALESCE(ui.metadata, '{}'::jsonb) || jsonb_build_object('access', 'unlimited_until_expiry'),
    updated_at = now()
FROM public.events e
WHERE ui.item_slug = 'event_ticket:' || e.id::text;

SELECT public.cleanup_expired_event_tickets();

REVOKE ALL ON FUNCTION public.event_ticket_expiry(date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_event_tickets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_event_ticket(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_event_ticket_for_room(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_event_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_event_ticket_for_room(uuid, text) TO authenticated;
