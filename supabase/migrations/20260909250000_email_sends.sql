-- Email send log (email backend workstream): every outbound email sent through
-- supabase/functions/_shared/email.ts writes a row here. Bodies are NEVER
-- stored — only recipient, template key, subject, status, Resend id, and error.
--
-- opened_at is reserved for future Resend open/delivery webhooks (no webhook
-- receiver exists yet; see EMAIL-BACKEND.md).
--
-- Idempotent; safe to re-run. RLS mirrors the admin_coupons pattern:
-- admins only, service-role edge functions bypass RLS.

CREATE TABLE IF NOT EXISTS public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template_key text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  resend_id text,
  error text,
  -- Optional correlation to the account that triggered the email; powers
  -- exactly-once dedup checks (e.g. card_printed per profile).
  profile_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);

CREATE INDEX IF NOT EXISTS email_sends_to_email_idx
  ON public.email_sends (to_email, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_sends_template_idx
  ON public.email_sends (template_key, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_sends_profile_idx
  ON public.email_sends (profile_id, template_key)
  WHERE profile_id IS NOT NULL;

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email sends" ON public.email_sends;
CREATE POLICY "Admins can manage email sends" ON public.email_sends
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
