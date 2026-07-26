-- Restore security_invoker on the view (per DB security baseline). The view will
-- only work for signed-in users who satisfy RLS; anon lookups go through the RPC.
ALTER VIEW public.personal_profiles_public SET (security_invoker = true);

-- Public read RPC, mirroring get_public_restaurant_hub. Returns at most one row
-- and only exposes columns that are safe to render on a public hub page.
CREATE OR REPLACE FUNCTION public.get_public_personal_profile(_slug text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  headline text,
  bio text,
  profile_photo_url text,
  header_image_url text,
  header_type text,
  header_color text,
  background_color text,
  pfp_position text,
  plan_type text,
  subscription_status text,
  contact_enabled boolean,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_company text,
  contact_title text,
  contact_address text,
  contact_website text,
  contact_photo_url text,
  banner_image_url text,
  show_shop_section boolean,
  is_founding_user boolean,
  founding_number integer,
  show_founding_badge boolean,
  bg_style text,
  vibe_id text,
  button_theme text,
  text_color text,
  show_username boolean,
  contact_display_style text,
  contact_button_label text,
  is_approved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.username, p.full_name, p.headline, p.bio, p.profile_photo_url,
    p.header_image_url, p.header_type, p.header_color, p.background_color, p.pfp_position,
    p.plan_type, p.subscription_status, p.contact_enabled, p.contact_name, p.contact_phone,
    p.contact_email, p.contact_company, p.contact_title, p.contact_address, p.contact_website,
    p.contact_photo_url, p.banner_image_url, p.show_shop_section, p.is_founding_user,
    p.founding_number, p.show_founding_badge, p.bg_style, p.vibe_id, p.button_theme,
    p.text_color, p.show_username, p.contact_display_style, p.contact_button_label, p.is_approved
  FROM public.personal_profiles p
  WHERE lower(p.username) = lower(_slug)
    AND (
      p.subscription_status = 'active'
      OR (p.subscription_status = 'trialing' AND p.is_approved = true)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_personal_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personal_profile(text) TO anon, authenticated;