DROP POLICY IF EXISTS "Authenticated users can add social comments" ON public.social_comments;

CREATE POLICY "Authenticated users can add social comments"
ON public.social_comments
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.social_content sc
      WHERE sc.id = content_id
        AND (sc.is_public = true OR sc.user_id = (SELECT auth.uid()) OR public.is_staff((SELECT auth.uid())))
    )
    OR EXISTS (
      SELECT 1 FROM public.photos p
      WHERE p.id = content_id
        AND (p.is_banned = false OR p.user_id = (SELECT auth.uid()) OR public.is_staff((SELECT auth.uid())))
    )
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

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_role(uuid, app_role) TO authenticated;