-- Backward-compatible preparation for isolated business checkout verification.
-- All six fields are nullable and no existing billing, permissions, triggers or
-- customer rows change. The later security migrations remain a separate release.
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_attempt_hash text;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_request_hash text;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_attempt_started_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_return_origin text;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS payment_hold_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS payment_hold_reason text;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_intents_attempt_unique ON public.checkout_intents(checkout_attempt_hash) WHERE checkout_attempt_hash IS NOT NULL;
