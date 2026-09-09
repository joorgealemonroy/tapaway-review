CREATE TABLE IF NOT EXISTS public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template_key text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  resend_id text,
  error text,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sends TO authenticated;
GRANT ALL ON public.email_sends TO service_role;

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email sends" ON public.email_sends;
CREATE POLICY "Admins can manage email sends" ON public.email_sends
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());