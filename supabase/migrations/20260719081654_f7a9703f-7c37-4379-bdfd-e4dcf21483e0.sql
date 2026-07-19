
-- Allow sales reps to fully manage the demo profiles they own until the profile is approved and claimed
CREATE POLICY "Reps can view their demo profiles"
ON public.personal_profiles
FOR SELECT
TO authenticated
USING (sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid());

CREATE POLICY "Reps can update their demo profiles"
ON public.personal_profiles
FOR UPDATE
TO authenticated
USING ((sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid()) AND is_approved = false)
WITH CHECK ((sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid()));

CREATE POLICY "Reps can manage links on their demo profiles"
ON public.personal_links
FOR ALL
TO authenticated
USING (profile_id IN (
  SELECT id FROM public.personal_profiles
  WHERE (sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid()) AND is_approved = false
))
WITH CHECK (profile_id IN (
  SELECT id FROM public.personal_profiles
  WHERE (sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid()) AND is_approved = false
));

CREATE POLICY "Reps can manage blocks on their demo profiles"
ON public.personal_blocks
FOR ALL
TO authenticated
USING (profile_id IN (
  SELECT id FROM public.personal_profiles
  WHERE (sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid()) AND is_approved = false
))
WITH CHECK (profile_id IN (
  SELECT id FROM public.personal_profiles
  WHERE (sales_rep_id = auth.uid() OR created_by_rep_id = auth.uid()) AND is_approved = false
));
