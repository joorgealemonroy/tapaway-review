
CREATE OR REPLACE FUNCTION public.personal_profile_is_active(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.personal_profiles
    WHERE id = _profile_id
      AND subscription_status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.personal_profile_is_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.personal_profile_is_active(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view links for active profiles" ON public.personal_links;
CREATE POLICY "Public can view links for active profiles"
ON public.personal_links
FOR SELECT
USING (
  is_active = true
  AND public.personal_profile_is_active(profile_id)
);

DROP POLICY IF EXISTS "Public can view blocks on active profiles" ON public.personal_blocks;
CREATE POLICY "Public can view blocks on active profiles"
ON public.personal_blocks
FOR SELECT
USING (
  is_active = true
  AND public.personal_profile_is_active(profile_id)
);
