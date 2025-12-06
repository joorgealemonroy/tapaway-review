-- The restaurant_public_info view now uses security_invoker=true
-- which means anonymous users can't access it because restaurants table requires auth
-- We need to either:
-- 1. Change back to security_definer for this specific view (since it only exposes public fields)
-- 2. Or add RLS policy to allow public select on restaurants

-- Option 1 is safer - recreate view with security_definer but keep it limited to public fields
DROP VIEW IF EXISTS public.restaurant_public_info;

CREATE VIEW public.restaurant_public_info
WITH (security_barrier = true)
AS
SELECT 
  id,
  restaurant_name,
  header_title,
  header_subtitle,
  menu_title,
  google_review_url,
  yelp_review_url,
  directions_url,
  instagram_url,
  logo_url,
  custom_slug,
  type,
  hub_background_style,
  custom_background_url,
  avm_question_title,
  avm_question_subtitle,
  avm_positive_label,
  avm_negative_label
FROM public.restaurants;

-- Grant access to anon and authenticated roles
GRANT SELECT ON public.restaurant_public_info TO anon;
GRANT SELECT ON public.restaurant_public_info TO authenticated;