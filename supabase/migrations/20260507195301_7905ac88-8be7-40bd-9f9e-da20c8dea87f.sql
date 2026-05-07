-- Harden helper functions used by RLS so policies resolve reliably.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'master_web'::app_role)
      OR public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'moderator'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_role(_actor_id uuid, _target_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _actor_id IS NULL THEN false
    WHEN _target_role = 'master_web'::app_role THEN false
    WHEN _target_role = 'admin'::app_role THEN public.has_role(_actor_id, 'master_web'::app_role)
    WHEN _target_role = 'moderator'::app_role THEN public.has_role(_actor_id, 'master_web'::app_role) OR public.has_role(_actor_id, 'admin'::app_role)
    ELSE public.has_role(_actor_id, 'master_web'::app_role) OR public.has_role(_actor_id, 'admin'::app_role)
  END
$$;

-- Keep events robust even if a stale client sends id: null.
CREATE OR REPLACE FUNCTION public.ensure_event_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.id := COALESCE(NEW.id, gen_random_uuid());
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_event_defaults_trigger ON public.events;
CREATE TRIGGER ensure_event_defaults_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_event_defaults();

-- Add relation safety for social comments without breaking existing valid data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_comments_content_id_social_content_fkey'
      AND conrelid = 'public.social_comments'::regclass
  ) THEN
    ALTER TABLE public.social_comments
      ADD CONSTRAINT social_comments_content_id_social_content_fkey
      FOREIGN KEY (content_id) REFERENCES public.social_content(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Replace brittle policies with explicit authenticated/public policies.
DROP POLICY IF EXISTS "Users can send messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can see own messages" ON public.private_messages;
DROP POLICY IF EXISTS "Receiver can mark as read" ON public.private_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.private_messages;

CREATE POLICY "Authenticated users can send private messages"
ON public.private_messages
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = sender_id AND receiver_id IS NOT NULL);

CREATE POLICY "Users can read their private messages"
ON public.private_messages
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "Receivers can mark private messages read"
ON public.private_messages
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = receiver_id)
WITH CHECK ((SELECT auth.uid()) = receiver_id);

CREATE POLICY "Senders can delete private messages"
ON public.private_messages
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = sender_id);

DROP POLICY IF EXISTS "Users can send inbox messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can see own inbox messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Receiver can mark inbox as read" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can delete own sent inbox messages" ON public.inbox_messages;

CREATE POLICY "Authenticated users can send inbox messages"
ON public.inbox_messages
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = sender_id AND receiver_id IS NOT NULL);

CREATE POLICY "Users and staff can read inbox messages"
ON public.inbox_messages
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = sender_id
  OR (SELECT auth.uid()) = receiver_id
  OR (channel = 'staff' AND public.is_staff((SELECT auth.uid())))
);

CREATE POLICY "Receivers can mark inbox messages read"
ON public.inbox_messages
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = receiver_id)
WITH CHECK ((SELECT auth.uid()) = receiver_id);

CREATE POLICY "Senders can delete inbox messages"
ON public.inbox_messages
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = sender_id);

DROP POLICY IF EXISTS "Users can add comments" ON public.social_comments;
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.social_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.social_comments;

CREATE POLICY "Social comments are public"
ON public.social_comments
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can add social comments"
ON public.social_comments
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.social_content sc
    WHERE sc.id = content_id
      AND (sc.is_public = true OR sc.user_id = (SELECT auth.uid()) OR public.is_staff((SELECT auth.uid())))
  )
  AND (
    parent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.social_comments parent
      WHERE parent.id = parent_id
        AND parent.content_id = social_comments.content_id
    )
  )
);

CREATE POLICY "Owners and staff can delete social comments"
ON public.social_comments
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id OR public.is_staff((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can create events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

CREATE POLICY "Events are public"
ON public.events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Staff can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff((SELECT auth.uid())) AND created_by = (SELECT auth.uid()));

CREATE POLICY "Staff can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (public.is_staff((SELECT auth.uid())))
WITH CHECK (public.is_staff((SELECT auth.uid())));

CREATE POLICY "Master web can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'master_web'::app_role));

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only master_web can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Roles viewable by everyone" ON public.user_roles;

CREATE POLICY "Roles are readable by authenticated users"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master and admins can grant allowed roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_role((SELECT auth.uid()), role));

CREATE POLICY "Master and admins can update allowed roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.can_manage_role((SELECT auth.uid()), role))
WITH CHECK (public.can_manage_role((SELECT auth.uid()), role));

CREATE POLICY "Master and admins can revoke allowed roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.can_manage_role((SELECT auth.uid()), role));

DROP POLICY IF EXISTS "Staff can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;

CREATE POLICY "Event images are public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'event-images');

CREATE POLICY "Staff can upload event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images' AND public.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can update event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images' AND public.is_staff((SELECT auth.uid())))
WITH CHECK (bucket_id = 'event-images' AND public.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can delete event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-images' AND public.is_staff((SELECT auth.uid())));