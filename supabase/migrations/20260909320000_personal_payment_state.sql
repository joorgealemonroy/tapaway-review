-- Complimentary toggle for Solo accounts.
--
-- Locked decision 2026-09-09: Jorge gifts accounts sometimes and doesn't
-- track them. This adds the same payment_state marker that restaurants
-- already carry to public.personal_profiles, so the admin UI can offer a
-- one-tap "Complimentary" toggle for ANY account.
--
-- Semantics: payment_state='complimentary' means the account never gets
-- billed or broadcast-chased (send-feature-update, trial-followup, and the
-- new send-payment-recovery nudge all exclude it). Clearing the toggle sets
-- it back to 'unknown_manual' — Jorge then sets the real value by looking
-- at the account's Stripe state.
--
-- Idempotent via IF NOT EXISTS; safe to re-run.

ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'unknown_manual'
    CHECK (payment_state IN ('paying','complimentary','trialing','past_due','canceled','none','unknown_manual'));

CREATE INDEX IF NOT EXISTS personal_profiles_payment_state_idx
  ON public.personal_profiles (payment_state);
