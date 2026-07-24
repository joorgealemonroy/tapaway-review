CREATE OR REPLACE FUNCTION public.get_public_restaurant_hub(_slug text DEFAULT NULL, _id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  restaurant_name text,
  header_title text,
  header_subtitle text,
  menu_title text,
  google_review_url text,
  yelp_review_url text,
  directions_url text,
  instagram_url text,
  logo_url text,
  custom_slug text,
  type text,
  hub_background_style text,
  custom_background_url text,
  avm_question_title text,
  avm_question_subtitle text,
  avm_positive_label text,
  avm_negative_label text,
  phone text,
  expires_at timestamptz,
  background_theme_style text,
  primary_color text,
  secondary_color text,
  business_phone text,
  is_approved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.restaurant_name,
    r.header_title,
    r.header_subtitle,
    r.menu_title,
    r.google_review_url,
    r.yelp_review_url,
    r.directions_url,
    r.instagram_url,
    r.logo_url,
    r.custom_slug,
    r.type,
    r.hub_background_style,
    r.custom_background_url,
    r.avm_question_title,
    r.avm_question_subtitle,
    r.avm_positive_label,
    r.avm_negative_label,
    r.phone,
    r.expires_at,
    r.background_theme_style,
    r.primary_color,
    r.secondary_color,
    r.business_phone,
    r.is_approved
  FROM public.restaurants r
  WHERE r.is_approved = true
    AND (
      (_slug IS NOT NULL AND lower(r.custom_slug) = lower(_slug))
      OR (_id IS NOT NULL AND r.id = _id)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_restaurant_hub(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_hub(text, uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Approved restaurant hubs are publicly visible" ON public.restaurants;