DROP POLICY IF EXISTS "Users can view their own analytics" ON personal_analytics;

CREATE POLICY "Users and admins can view analytics"
  ON personal_analytics FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT id FROM personal_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );