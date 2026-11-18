ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS buttons_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.personal_links DROP CONSTRAINT IF EXISTS personal_links_display_style_check;
ALTER TABLE public.personal_links ADD CONSTRAINT personal_links_display_style_check
  CHECK (display_style IS NULL OR display_style IN ('pill', 'icon', 'both', 'grid', 'card', 'button'));

DROP FUNCTION IF EXISTS public.get_public_personal_profile(text);
CREATE FUNCTION public.get_public_personal_profile(_slug text)
 RETURNS TABLE(id uuid, user_id uuid, username text, full_name text, headline text, bio text, profile_photo_url text, header_image_url text, header_type text, header_color text, background_color text, pfp_position text, plan_type text, subscription_status text, contact_enabled boolean, contact_name text, contact_phone text, contact_email text, contact_company text, contact_title text, contact_address text, contact_website text, contact_photo_url text, banner_image_url text, show_shop_section boolean, is_founding_user boolean, founding_number integer, show_founding_badge boolean, bg_style text, vibe_id text, button_theme text, text_color text, show_username boolean, contact_display_style text, contact_button_label text, is_approved boolean, created_by_rep_id uuid, logo_scale text, logo_bg_color text, banner_fit text, banner_aspect text, buttons_only boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id, p.user_id, p.username, p.full_name, p.headline, p.bio, p.profile_photo_url,
    p.header_image_url, p.header_type, p.header_color, p.background_color, p.pfp_position,
    p.plan_type, p.subscription_status, p.contact_enabled, p.contact_name, p.contact_phone,
    p.contact_email, p.contact_company, p.contact_title, p.contact_address, p.contact_website,
    p.contact_photo_url, p.banner_image_url, p.show_shop_section, p.is_founding_user,
    p.founding_number, p.show_founding_badge, p.bg_style, p.vibe_id, p.button_theme,
    p.text_color, p.show_username, p.contact_display_style, p.contact_button_label,
    p.is_approved, p.created_by_rep_id, p.logo_scale, p.logo_bg_color,
    p.banner_fit, p.banner_aspect, p.buttons_only
  FROM public.personal_profiles p
  WHERE lower(p.username) = lower(_slug)
    AND (
      public.hub_access_allowed(p.subscription_status,p.is_approved,p.payment_state,p.trial_ends_at,p.created_at,p.stripe_subscription_id)
    )
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_public_personal_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personal_profile(text) TO anon, authenticated, service_role;