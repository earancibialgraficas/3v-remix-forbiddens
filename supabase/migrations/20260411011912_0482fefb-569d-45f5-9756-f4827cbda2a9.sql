
CREATE OR REPLACE FUNCTION public.toggle_post_vote(
  p_post_id uuid,
  p_user_id uuid,
  p_vote_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_vote record;
  new_upvotes integer;
  new_downvotes integer;
  user_vote text;
BEGIN
  -- Lock the post row to prevent concurrent updates
  PERFORM 1 FROM public.posts WHERE id = p_post_id FOR UPDATE;

  -- Check existing vote
  SELECT * INTO existing_vote FROM public.post_votes
    WHERE post_id = p_post_id AND user_id = p_user_id;

  IF existing_vote IS NOT NULL THEN
    IF existing_vote.vote_type = p_vote_type THEN
      -- Same vote: remove it
      DELETE FROM public.post_votes WHERE id = existing_vote.id;
      user_vote := null;
    ELSE
      -- Different vote: update it
      UPDATE public.post_votes SET vote_type = p_vote_type WHERE id = existing_vote.id;
      user_vote := p_vote_type;
    END IF;
  ELSE
    -- No existing vote: create one
    INSERT INTO public.post_votes (user_id, post_id, vote_type)
    VALUES (p_user_id, p_post_id, p_vote_type);
    user_vote := p_vote_type;
  END IF;

  -- Recount
  SELECT COUNT(*) INTO new_upvotes FROM public.post_votes WHERE post_id = p_post_id AND vote_type = 'up';
  SELECT COUNT(*) INTO new_downvotes FROM public.post_votes WHERE post_id = p_post_id AND vote_type = 'down';

  -- Update the post
  UPDATE public.posts SET upvotes = new_upvotes, downvotes = new_downvotes WHERE id = p_post_id;

  RETURN json_build_object('upvotes', new_upvotes, 'downvotes', new_downvotes, 'user_vote', user_vote);
END;
$$;
