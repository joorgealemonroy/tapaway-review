-- Fix security definer view by explicitly setting SECURITY INVOKER
-- This ensures the view enforces the querying user's RLS policies, not the creator's
DROP VIEW IF EXISTS public.restaurant_public_info;

CREATE VIEW public.restaurant_public_info 
WITH (security_invoker = true)
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
  custom_slug
FROM restaurants;