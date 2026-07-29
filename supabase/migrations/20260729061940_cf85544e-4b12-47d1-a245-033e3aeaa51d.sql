
ALTER TABLE public.personal_email_captures
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in_at timestamptz;

ALTER TABLE public.restaurant_sms_subscribers
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in_at timestamptz;

ALTER TABLE public.sms_signup_submissions
  ADD COLUMN IF NOT EXISTS marketing_consent_text text,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS transactional_consent_text text,
  ADD COLUMN IF NOT EXISTS transactional_consent_at timestamptz;
