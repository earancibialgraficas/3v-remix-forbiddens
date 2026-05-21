-- Soporte para salas especiales de evento con boletos consumibles.
-- Idempotente: se puede correr aunque ya existan columnas/funciones previas.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS highlight_until timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_price_fcoins bigint NOT NULL DEFAULT 0 CHECK (ticket_price_fcoins >= 0),
  ADD COLUMN IF NOT EXISTS event_platform_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS event_game_slug text,
  ADD COLUMN IF NOT EXISTS event_game_label text;

CREATE TABLE IF NOT EXISTS public.event_ticket_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_item_id uuid,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.event_ticket_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event ticket purchases own read" ON public.event_ticket_purchases;
CREATE POLICY "event ticket purchases own read"
ON public.event_ticket_purchases
FOR SELECT
USING (auth.uid()::text = user_id);

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
BEGIN
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

  IF EXISTS (
    SELECT 1
    FROM public.event_ticket_purchases
    WHERE user_id = uid
      AND event_id = ev.id
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
      'price_fcoins', ev.ticket_price_fcoins,
      'game_slug', ev.event_game_slug,
      'game_label', ev.event_game_label
    )
  )
  RETURNING id INTO new_ticket_id;

  INSERT INTO public.event_ticket_purchases (user_id, event_id, ticket_item_id)
  VALUES (uid, ev.id, new_ticket_id);

  RETURN json_build_object(
    'ok', true,
    'event_id', ev.id,
    'ticket_name', 'Entrada: ' || ev.title,
    'price', ev.ticket_price_fcoins,
    'wallet_balance', COALESCE(next_wallet, 0)
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
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id, title, event_game_slug, created_at
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

  SELECT id, quantity
  INTO ticket
  FROM public.user_inventory
  WHERE user_id = uid
    AND item_slug = 'event_ticket:' || ev.id::text
    AND COALESCE(quantity, 0) > 0
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF ticket.id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'ticket_required');
  END IF;

  IF COALESCE(ticket.quantity, 1) <= 1 THEN
    DELETE FROM public.user_inventory WHERE id = ticket.id;
  ELSE
    UPDATE public.user_inventory
    SET quantity = quantity - 1,
        updated_at = now()
    WHERE id = ticket.id;
  END IF;

  UPDATE public.event_ticket_purchases
  SET consumed_at = COALESCE(consumed_at, now())
  WHERE user_id = uid
    AND event_id = ev.id;

  RETURN json_build_object('ok', true, 'event_id', ev.id, 'event_title', ev.title);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_event_ticket(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_event_ticket_for_room(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_event_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_event_ticket_for_room(uuid, text) TO authenticated;
