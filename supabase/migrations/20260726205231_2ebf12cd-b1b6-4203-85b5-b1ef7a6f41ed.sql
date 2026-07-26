-- 1. Public SELECT policy on personal_profiles (narrow: only publicly visible rows)
DROP POLICY IF EXISTS "Public can view approved active profiles" ON public.personal_profiles;
CREATE POLICY "Public can view approved active profiles"
  ON public.personal_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    subscription_status = 'active'
    OR (subscription_status = 'trialing' AND is_approved = true)
  );

-- 2. Recreate the public view with explicit parens + security_invoker
DROP VIEW IF EXISTS public.personal_profiles_public;
CREATE VIEW public.personal_profiles_public
WITH (security_invoker = true) AS
SELECT
  id, user_id, username, full_name, headline, bio, profile_photo_url,
  header_image_url, header_type, header_color, background_color, pfp_position,
  plan_type, subscription_status, contact_enabled, contact_name, contact_phone,
  contact_email, contact_company, contact_title, contact_address, contact_website,
  contact_photo_url, banner_image_url, show_shop_section, is_founding_user,
  founding_number, show_founding_badge, bg_style, vibe_id, button_theme,
  text_color, show_username, contact_display_style, contact_button_label, is_approved
FROM public.personal_profiles
WHERE subscription_status = 'active'
   OR (subscription_status = 'trialing' AND is_approved = true);

GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;

-- 3. Admin-only hub health snapshot
CREATE OR REPLACE FUNCTION public.get_hub_health()
RETURNS TABLE(
  slug text,
  kind text,
  owner_label text,
  expected_status text,
  subscription_status text,
  is_approved boolean,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT
      p.username AS slug,
      'personal'::text AS kind,
      COALESCE(p.full_name, p.email) AS owner_label,
      CASE
        WHEN p.subscription_status = 'active'
          OR (p.subscription_status = 'trialing' AND p.is_approved = true)
          THEN 'live' ELSE 'expired'
      END AS expected_status,
      p.subscription_status,
      p.is_approved,
      p.trial_ends_at AS expires_at
    FROM public.personal_profiles p
    WHERE p.username IS NOT NULL
    UNION ALL
    SELECT
      r.custom_slug AS slug,
      'restaurant'::text AS kind,
      r.restaurant_name AS owner_label,
      CASE
        WHEN r.is_approved = true AND (r.expires_at IS NULL OR r.expires_at > now())
          THEN 'live' ELSE 'expired'
      END AS expected_status,
      r.subscription_status,
      r.is_approved,
      r.expires_at
    FROM public.restaurants r
    WHERE r.custom_slug IS NOT NULL
  ) x
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.get_hub_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hub_health() TO authenticated;