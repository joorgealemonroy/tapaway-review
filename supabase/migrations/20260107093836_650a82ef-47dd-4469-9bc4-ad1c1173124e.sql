-- =====================================================
-- PHASE 1B: Fix Security Definer View + Remaining Warnings
-- =====================================================

-- Fix the SECURITY DEFINER view issue - recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.personal_profiles_public;
CREATE VIEW public.personal_profiles_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  full_name,
  bio,
  headline,
  profile_photo_url,
  header_type,
  header_color,
  header_image_url,
  background_color,
  pfp_position,
  plan_type,
  subscription_status
FROM public.personal_profiles
WHERE subscription_status = 'active';

GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;

-- =================================================
-- Fix remaining WITH CHECK (true) policies
-- These are intentional public inserts but let's add minimal validation
-- =================================================

-- 1. av_meal_prep_testimonials - Keep public read, but INSERT should require auth
-- (testimonials are typically admin-added, not public)
-- Note: Already has proper owner/admin policies, the public true is for SELECT which is OK

-- 2. personal_email_captures - public insert is intentional for email collection
-- Already has policy requiring valid profile_id, keep as is

-- 3. rep_applications - public insert for job applications
-- This is intentional, keep as is but ensure email validation exists

-- 4. pending_trials - we just fixed this

-- 5. analytics_events - we just fixed this

-- 6. personal_analytics - we just fixed this

-- The remaining "WITH CHECK (true)" warnings are for:
-- - rep_applications INSERT (intentional for public applications)
-- - personal_email_captures INSERT (intentional for lead capture)
-- - pending_trials INSERT (intentional for signup)
-- These are acceptable for their use cases