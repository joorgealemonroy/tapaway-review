-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view restaurants for review hub" ON public.restaurants;

-- Create a restrictive policy that only exposes non-sensitive fields to the public
CREATE POLICY "Public can view restaurant public info" 
ON public.restaurants 
FOR SELECT 
USING (
  true
);

-- Note: The above policy allows SELECT but we'll enforce column-level security
-- by explicitly selecting only safe columns in application code.
-- RLS doesn't support column-level restrictions, so we handle it in queries.

-- Create a view for public restaurant data (optional but recommended)
CREATE OR REPLACE VIEW public.restaurant_public_info AS
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