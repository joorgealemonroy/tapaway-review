CREATE OR REPLACE FUNCTION public.get_public_personal_profile_status(_slug text)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  headline text,
  bio text,
  profile_photo_url text,
  header_image_url text,
  background_color text,
  bg_style text,
  text_color text,
  button_theme text,
  pfp_position text,
  plan_type text,
  subscription_status text,
  is_approved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.headline,
    p.bio,
    p.profile_photo_url,
    p.header_image_url,
    p.background_color,
    p.bg_style,
    p.text_color,
    p.button_theme,
    p.pfp_position,
    p.plan_type,
    p.subscription_status,
    p.is_approved
  FROM public.personal_profiles p
  WHERE lower(p.username) = lower(_slug)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_personal_profile_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personal_profile_status(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_restaurant_hub_status(_slug text DEFAULT NULL, _id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  restaurant_name text,
  custom_slug text,
  subscription_status text,
  payment_state text,
  is_approved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.restaurant_name,
    r.custom_slug,
    r.subscription_status,
    r.payment_state,
    r.is_approved
  FROM public.restaurants r
  WHERE (
      (_slug IS NOT NULL AND lower(r.custom_slug) = lower(_slug))
      OR (_id IS NOT NULL AND r.id = _id)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_restaurant_hub_status(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_hub_status(text, uuid) TO anon, authenticated, service_role;