
-- 1. Add 'affiliate' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- 2. Create affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  max_invites int NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access to affiliates"
ON public.affiliates FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Affiliate can read own row
CREATE POLICY "Affiliates can read own row"
ON public.affiliates FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create affiliate_referrals table
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_profile_id uuid NULL REFERENCES public.personal_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address text NULL
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access to affiliate_referrals"
ON public.affiliate_referrals FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Affiliate can read own referrals
CREATE POLICY "Affiliates can read own referrals"
ON public.affiliate_referrals FOR SELECT
TO authenticated
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to insert referrals (for signup flow)
CREATE POLICY "Authenticated users can log referrals"
ON public.affiliate_referrals FOR INSERT
TO authenticated
WITH CHECK (referred_user_id = auth.uid());

-- 4. Add columns to personal_profiles
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS referred_by text NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL;

-- 5. Create is_affiliate() function
CREATE OR REPLACE FUNCTION public.is_affiliate()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE user_id = auth.uid() AND is_active = true
  )
$$;
