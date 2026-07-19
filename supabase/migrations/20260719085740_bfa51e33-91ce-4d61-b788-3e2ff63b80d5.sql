GRANT SELECT ON public.personal_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view active or approved trialing profiles" ON public.personal_profiles;

CREATE POLICY "Public can view active or approved trialing profiles"
ON public.personal_profiles
FOR SELECT
TO anon, authenticated
USING (
  subscription_status = 'active'
  OR (subscription_status = 'trialing' AND is_approved = true)
);