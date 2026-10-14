ALTER TABLE public.checkout_intents
  ADD COLUMN IF NOT EXISTS user_created_by_purchase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_session_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS verify_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE INDEX IF NOT EXISTS checkout_intents_email_idx ON public.checkout_intents (lower(email));
CREATE INDEX IF NOT EXISTS checkout_intents_user_idx ON public.checkout_intents (user_id);
CREATE INDEX IF NOT EXISTS onboarding_sessions_user_idx ON public.onboarding_sessions (user_id);