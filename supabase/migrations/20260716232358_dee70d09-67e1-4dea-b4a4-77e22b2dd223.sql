
CREATE OR REPLACE VIEW public.restaurant_public_info
WITH (security_invoker = true) AS
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
  avm_negative_label,
  phone,
  expires_at,
  background_theme_style,
  primary_color,
  secondary_color,
  business_phone,
  is_approved
FROM public.restaurants;

GRANT SELECT ON public.restaurant_public_info TO anon, authenticated;
