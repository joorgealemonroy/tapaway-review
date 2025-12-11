-- Fix Security Definer Views by recreating them with SECURITY INVOKER
-- Also add proper RLS policies where needed

-- 1. Drop and recreate rep_payout_display view with SECURITY INVOKER
DROP VIEW IF EXISTS public.rep_payout_display;

CREATE VIEW public.rep_payout_display 
WITH (security_invoker = true)
AS
SELECT 
  id,
  rep_user_id,
  payee_name,
  payee_type,
  bank_name,
  account_last4,
  created_at,
  updated_at
FROM public.rep_payout_accounts;

-- 2. Drop and recreate rep_tax_status view with SECURITY INVOKER
DROP VIEW IF EXISTS public.rep_tax_status;

CREATE VIEW public.rep_tax_status
WITH (security_invoker = true)
AS
SELECT 
  rep_user_id,
  status,
  CASE
    WHEN status = 'rejected' THEN note
    ELSE NULL
  END AS rejection_note,
  created_at,
  updated_at
FROM public.rep_tax_profiles;

-- 3. Drop and recreate restaurant_public_info view with SECURITY INVOKER
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
  custom_slug,
  type,
  hub_background_style,
  custom_background_url,
  avm_question_title,
  avm_question_subtitle,
  avm_positive_label,
  avm_negative_label
FROM public.restaurants;

-- Add RLS policy for restaurant_public_info to allow public SELECT for hub pages
-- (This is intentional for public review hubs)
COMMENT ON VIEW public.restaurant_public_info IS 'Public-safe restaurant info for review hubs. Only non-sensitive fields exposed intentionally.';

-- Add policy for support_requests: users can only view their own requests
-- First check if policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_requests' 
    AND policyname = 'Users can view their own support requests'
  ) THEN
    CREATE POLICY "Users can view their own support requests" 
    ON public.support_requests 
    FOR SELECT 
    USING (user_id = auth.uid() OR public.is_admin());
  END IF;
END $$;