-- Checkout retry state is server-owned. It cannot confer account access.
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_attempt_hash text;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_request_hash text;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_attempt_started_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS checkout_return_origin text;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_intents_attempt_unique ON public.checkout_intents(checkout_attempt_hash) WHERE checkout_attempt_hash IS NOT NULL;
