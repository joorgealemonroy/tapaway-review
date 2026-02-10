
-- Affiliate commissions table
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id uuid NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_commissions_referral_unique UNIQUE (referral_id)
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on affiliate_commissions"
  ON public.affiliate_commissions FOR ALL
  USING (public.is_admin());

-- Affiliates can view their own commissions
CREATE POLICY "Affiliates can view own commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_commissions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Affiliate settings table (single-row config)
CREATE TABLE public.affiliate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_per_referral numeric NOT NULL DEFAULT 5.00,
  payout_minimum numeric NOT NULL DEFAULT 20.00,
  program_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on affiliate_settings"
  ON public.affiliate_settings FOR ALL
  USING (public.is_admin());

-- Everyone can read settings (needed by signup flow to get commission amount)
CREATE POLICY "Anyone can read affiliate_settings"
  ON public.affiliate_settings FOR SELECT
  USING (true);

-- Seed initial settings row
INSERT INTO public.affiliate_settings (commission_per_referral, payout_minimum, program_enabled)
VALUES (5.00, 20.00, true);

-- Affiliate abuse flags table
CREATE TABLE public.affiliate_abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  details text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_abuse_flags ENABLE ROW LEVEL SECURITY;

-- Admin full access only
CREATE POLICY "Admins full access on affiliate_abuse_flags"
  ON public.affiliate_abuse_flags FOR ALL
  USING (public.is_admin());
