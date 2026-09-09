-- CARD-CHECK: $1 trial card-verification markers on restaurants.
--
-- stripe-webhook / verify-checkout record the verify-trial-card result here so the
-- check is idempotent (skip when already verified for this subscription) and so
-- /onboarding can surface a failed verification to the customer.
--
-- card_check_status: 'passed' | 'failed' | NULL (NULL = check not run / not required,
--   e.g. immediate-charge sessions, van sales, legacy rows)
-- card_check_message: plain-language decline message from verify-trial-card, shown
--   directly to the customer when card_check_status = 'failed'.
-- A failed row is also kept OUT of 'trialing': subscription_status stays
-- 'incomplete' so the trial never goes live (fail-closed) and the hub gate
-- (Fix 3) keeps the hub paused.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS card_check_status text,
  ADD COLUMN IF NOT EXISTS card_check_message text;
