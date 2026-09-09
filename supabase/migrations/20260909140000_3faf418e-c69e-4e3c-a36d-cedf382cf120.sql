-- Fix (workstream C): family/comped-account exemption for the expired-hub gating.
--
-- NOTE ON SCHEMA: the verified spec said restaurants.payment_state already
-- existed, but in this repo's migration history payment_state /
-- billing_source only exist on public.business_locations (migration
-- 20260830110218). restaurants has no payment_state column, so this migration
-- adds it here (idempotent via IF NOT EXISTS) with the same CHECK values,
-- then CREATE OR REPLACEs both RPCs. If the production DB already carries
-- the column from out-of-band drift, the ADD COLUMN is a no-op.
--
-- Restaurants with payment_state = 'complimentary' are free on purpose
-- (family accounts). They must NEVER be paused or nurture-texted:
--   1. get_public_restaurant_hub also resolves when
--      r.payment_state = 'complimentary', regardless of subscription_status.
--   2. get_public_restaurant_hub_status additionally returns payment_state so
--      the frontend can skip its own paused gate for comped accounts.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'unknown_manual'
    CHECK (payment_state IN ('paying','complimentary','trialing','past_due','canceled','none','unknown_manual'));

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
      -- Comped accounts (family, free on purpose) are never gated off,
      -- regardless of subscription_status.
      OR r.payment_state = 'complimentary'
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
-- Resolves for approved hubs regardless of subscription status; now also
-- returns payment_state so the frontend can skip the paused gate entirely
-- for comped accounts.
CREATE OR REPLACE FUNCTION public.get_public_restaurant_hub_status(_slug text DEFAULT NULL, _id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  restaurant_name text,
  custom_slug text,
  subscription_status text,
  payment_state text,
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
    r.payment_state,
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
