-- Fix the security definer view issue by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.restaurant_public_info;

CREATE OR REPLACE VIEW public.restaurant_public_info 
WITH (security_invoker = true)
AS
SELECT 
  id,
  restaurant_name,
  address,
  header_title,
  header_subtitle,
  menu_title,
  google_review_url,
  yelp_review_url,
  directions_url,
  instagram_url,
  logo_url
FROM public.restaurants;

-- Allow public to read from the view
GRANT SELECT ON public.restaurant_public_info TO anon, authenticated;