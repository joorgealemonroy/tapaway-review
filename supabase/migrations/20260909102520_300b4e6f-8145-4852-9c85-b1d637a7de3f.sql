ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'unknown_manual'
    CHECK (payment_state IN ('paying','complimentary','trialing','past_due','canceled','none','unknown_manual'));

CREATE INDEX IF NOT EXISTS personal_profiles_payment_state_idx
  ON public.personal_profiles (payment_state);