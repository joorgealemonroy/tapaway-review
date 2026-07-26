CREATE OR REPLACE FUNCTION public.get_public_personal_showcase(_limit integer DEFAULT 6)
RETURNS TABLE(
  id uuid,
  username text,
  full_name text,
  headline text,
  profile_photo_url text,
  header_type text,
  header_color text,
  background_color text,
  plan_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.full_name, p.headline, p.profile_photo_url,
         p.header_type, p.header_color, p.background_color, p.plan_type
  FROM public.personal_profiles p
  WHERE p.subscription_status = 'active'
    AND p.profile_photo_url IS NOT NULL
    AND p.username NOT IN ('lovie','tapjorge','tapaway')
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 6), 24));
$$;

REVOKE ALL ON FUNCTION public.get_public_personal_showcase(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personal_showcase(integer) TO anon, authenticated;