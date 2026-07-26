CREATE TABLE public.sms_signup_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  consent_text text NOT NULL,
  consent_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  source text NOT NULL DEFAULT '/sms-signup',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.sms_signup_submissions TO anon;
GRANT INSERT, SELECT ON public.sms_signup_submissions TO authenticated;
GRANT ALL ON public.sms_signup_submissions TO service_role;

ALTER TABLE public.sms_signup_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit sms signup"
  ON public.sms_signup_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view sms signups"
  ON public.sms_signup_submissions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());