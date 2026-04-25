-- Add SMS opt-in tracking to existing email captures table
ALTER TABLE public.personal_email_captures
  ADD COLUMN IF NOT EXISTS sms_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_opt_in_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_email_captures_sms_opt_in
  ON public.personal_email_captures (profile_id)
  WHERE sms_opt_in = true AND phone IS NOT NULL;

-- Campaign log
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_profile_created
  ON public.sms_campaigns (profile_id, created_at DESC);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view own campaigns" ON public.sms_campaigns;
CREATE POLICY "Owners view own campaigns" ON public.sms_campaigns
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins full access campaigns" ON public.sms_campaigns;
CREATE POLICY "Admins full access campaigns" ON public.sms_campaigns
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
-- Inserts/updates only via service-role (edge function); no INSERT/UPDATE/DELETE policies for owners.