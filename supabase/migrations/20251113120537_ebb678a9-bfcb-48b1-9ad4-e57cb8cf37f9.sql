-- Update restaurant_public_info view to include custom_slug
DROP VIEW IF EXISTS public.restaurant_public_info;

CREATE VIEW public.restaurant_public_info AS
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
  custom_slug
FROM public.restaurants;