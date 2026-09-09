-- Fix: expired-hub gating — close the "free forever" leak.
--
-- get_public_restaurant_hub previously only filtered on is_approved = true, so a
-- restaurant whose trial ended without payment (subscription_status = 'canceled',
-- set by the stripe-webhook customer.subscription.deleted handler) kept its hub,
-- NFC cards, and public links fully live. Add a subscription_status guard so the
-- hub data only resolves for live subscriptions, mirroring the guard pattern used
-- by get_public_personal_profile (active, or trialing + approved).
--
-- get_public_restaurant_hub_status is a lightweight companion RPC used by the
-- public hub page to distinguish "hub exists but subscription lapsed" (show the
-- Review Page Paused gate) from "no such hub" (show Hub Not Found). It returns
-- only minimal metadata for approved hubs and never resolves hub content.

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
      r.subscription_status = 'active'
      OR (r.subscription_status = 'trialing' AND r.is_approved = true)
    )
    AND (
      (_slug IS NOT NULL AND lower(r.custom_slug) = lower(_slug))
      OR (_id IS NOT NULL AND r.id = _id)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_restaurant_hub(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_hub(text, uuid) TO anon, authenticated, service_role;

-- Companion status lookup for the public hub page's paused-hub gate.
-- Resolves for approved hubs regardless of subscription status.
CREATE OR REPLACE FUNCTION public.get_public_restaurant_hub_status(_slug text DEFAULT NULL, _id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  restaurant_name text,
  custom_slug text,
  subscription_status text,
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
    r.custom_slug,
    r.subscription_status,
    r.is_approved
  FROM public.restaurants r
  WHERE r.is_approved = true
    AND (
      (_slug IS NOT NULL AND lower(r.custom_slug) = lower(_slug))
      OR (_id IS NOT NULL AND r.id = _id)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_restaurant_hub_status(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_hub_status(text, uuid) TO anon, authenticated, service_role;
