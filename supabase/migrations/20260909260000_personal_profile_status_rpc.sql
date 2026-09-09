-- Graceful expired-trial experience (solo/personal hubs).
--
-- The public profile RPC (get_public_personal_profile) resolves hub data only
-- for live subscriptions (active, or trialing + approved), so an expired
-- trial's public hub used to hit a dead-end "Profile not found" screen.
--
-- This companion RPC lets the public hub page distinguish "profile exists but
-- the subscription lapsed" (show the graceful trial-ended preview) from
-- "no such profile" (show Profile not found). It returns ONLY minimal,
-- already-public branding metadata for approved profiles — never links,
-- blocks, contact info, or billing fields — regardless of subscription
-- status. Content (links/blocks) stays gated behind the live-only RPC, so
-- the banner is a conversion surface, not a leak.
--
-- Status honesty: this RPC never changes anything. Profiles keep whatever
-- subscription_status they have (e.g. 'expired'); the frontend just renders
-- a different view.

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
    AND p.is_approved = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_personal_profile_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personal_profile_status(text) TO anon, authenticated, service_role;
