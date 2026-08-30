GRANT UPDATE (admin_review_state, admin_review_note, admin_reviewed_by, admin_reviewed_at) ON public.hub_link_checks TO authenticated;

DROP POLICY IF EXISTS "Admins can review link checks" ON public.hub_link_checks;
CREATE POLICY "Admins can review link checks"
  ON public.hub_link_checks FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());