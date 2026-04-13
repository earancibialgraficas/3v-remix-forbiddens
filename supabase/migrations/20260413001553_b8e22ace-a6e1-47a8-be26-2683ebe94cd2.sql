
-- 1. Signature advanced columns on profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS signature_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signature_font text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS signature_color text DEFAULT NULL;

-- 2. Optional message on friend requests
ALTER TABLE public.friend_requests
  ADD COLUMN IF NOT EXISTS message text DEFAULT NULL;

-- 3. Inbox messages table for public/staff channel
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'general',
  channel text NOT NULL DEFAULT 'public',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send inbox messages"
  ON public.inbox_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can see own inbox messages"
  ON public.inbox_messages FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR (
      channel = 'staff' AND (
        has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'master_web') 
        OR has_role(auth.uid(), 'moderator')
      )
    )
  );

CREATE POLICY "Receiver can mark inbox as read"
  ON public.inbox_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete own sent inbox messages"
  ON public.inbox_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- 4. Fix friend request notification trigger
-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friend_requests;

-- Rewrite the function to correctly notify
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Only notify on new pending requests (INSERT)
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (NEW.receiver_id, 'friend_request', 'Solicitud de amistad', 
            COALESCE(sender_name, 'Alguien') || ' te ha enviado una solicitud de amistad', 
            NEW.sender_id::text);
  END IF;
  
  -- Notify sender when receiver ACCEPTS
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    DECLARE
      accepter_name TEXT;
    BEGIN
      SELECT display_name INTO accepter_name FROM public.profiles WHERE user_id = NEW.receiver_id LIMIT 1;
      INSERT INTO public.notifications (user_id, type, title, body, related_id)
      VALUES (NEW.sender_id, 'friend_accepted', 'Solicitud aceptada', 
              COALESCE(accepter_name, 'Alguien') || ' aceptó tu solicitud de amistad', 
              NEW.receiver_id::text);
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Re-create trigger for both INSERT and UPDATE
CREATE TRIGGER on_friend_request_changed
  AFTER INSERT OR UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();

-- 5. Rewrite toggle_post_vote RPC for full atomicity
CREATE OR REPLACE FUNCTION public.toggle_post_vote(p_post_id uuid, p_user_id uuid, p_vote_type text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_vote record;
  new_upvotes integer;
  new_downvotes integer;
  user_vote text;
BEGIN
  -- Lock the post row to prevent concurrent updates
  PERFORM 1 FROM public.posts WHERE id = p_post_id FOR UPDATE;

  -- Check for existing vote with row lock
  SELECT * INTO existing_vote FROM public.post_votes
    WHERE post_id = p_post_id AND user_id = p_user_id
    FOR UPDATE;

  IF existing_vote IS NOT NULL THEN
    IF existing_vote.vote_type = p_vote_type THEN
      -- Same vote: remove it (toggle off)
      DELETE FROM public.post_votes WHERE id = existing_vote.id;
      user_vote := NULL;
    ELSE
      -- Different vote: switch it
      UPDATE public.post_votes SET vote_type = p_vote_type WHERE id = existing_vote.id;
      user_vote := p_vote_type;
    END IF;
  ELSE
    -- No existing vote: create one
    INSERT INTO public.post_votes (user_id, post_id, vote_type)
    VALUES (p_user_id, p_post_id, p_vote_type);
    user_vote := p_vote_type;
  END IF;

  -- Recount from source of truth
  SELECT COUNT(*) INTO new_upvotes FROM public.post_votes WHERE post_id = p_post_id AND vote_type = 'up';
  SELECT COUNT(*) INTO new_downvotes FROM public.post_votes WHERE post_id = p_post_id AND vote_type = 'down';

  -- Update the post counters
  UPDATE public.posts SET upvotes = new_upvotes, downvotes = new_downvotes WHERE id = p_post_id;

  RETURN json_build_object('upvotes', new_upvotes, 'downvotes', new_downvotes, 'user_vote', user_vote);
END;
$$;

-- 6. Index for inbox performance
CREATE INDEX IF NOT EXISTS idx_inbox_messages_receiver ON public.inbox_messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_channel ON public.inbox_messages(channel);
CREATE INDEX IF NOT EXISTS idx_private_messages_participants ON public.private_messages(sender_id, receiver_id);
