-- 1. Drop overly permissive restaurant SELECT
DROP POLICY IF EXISTS "Public can read restaurant public info" ON public.restaurants;

-- 2. Drop redundant support_requests SELECT
DROP POLICY IF EXISTS "Users can view own support requests" ON public.support_requests;

-- 3. Drop unvalidated analytics INSERT
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.personal_analytics;

-- 4a. Recreate personal_profiles_public with security_invoker
CREATE OR REPLACE VIEW public.personal_profiles_public
WITH (security_invoker = true)
AS SELECT id, username, full_name, headline, bio, profile_photo_url,
    header_image_url, header_type, header_color, background_color,
    pfp_position, plan_type, subscription_status, contact_enabled,
    contact_name, contact_phone, contact_email, contact_company,
    contact_title, contact_address, contact_website, contact_photo_url,
    banner_image_url, show_shop_section
FROM public.personal_profiles
WHERE subscription_status = 'active';

-- 4b. Recreate restaurant_public_info with schema-qualified table
CREATE OR REPLACE VIEW public.restaurant_public_info AS
SELECT id, restaurant_name, header_title, header_subtitle, menu_title,
    google_review_url, yelp_review_url, directions_url, instagram_url,
    logo_url, custom_slug, type, hub_background_style, custom_background_url,
    avm_question_title, avm_question_subtitle, avm_positive_label,
    avm_negative_label, phone
FROM public.restaurants;

-- 5. Fix function search path
ALTER FUNCTION public.cleanup_expired_archives() SET search_path = public;