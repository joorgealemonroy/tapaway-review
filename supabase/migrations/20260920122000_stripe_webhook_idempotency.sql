-- M-3 fix: Stripe webhook idempotency.
--
-- 1) processed_stripe_events: the webhook ATOMICALLY CLAIMS each event id at
--    the start of handling (claim_stripe_event(): INSERT ... ON CONFLICT DO
--    NOTHING, so exactly one concurrent delivery wins). The claim row starts
--    as status='claimed'; successful handling flips it to 'processed'. A
--    failed attempt DELETES its claim and returns 5xx so Stripe retries and
--    the retry re-claims. A stale claim (>15 min, worker died mid-flight) can
--    be taken over with an atomic conditional UPDATE. No RLS policies =
--    only the service role (webhook) can read/write.
-- 2) One commission row per (stripe_subscription_id, commission_type): a
--    retried checkout.session.completed / invoice.paid becomes a no-op instead
--    of double-paying rep commissions. The webhook uses upsert with
--    ignoreDuplicates so an in-flight status upgrade (trial_pending ->
--    pending/available) is never regressed by a replay.
-- 3) One personal_card_requests row per stripe_session_id: a retried
--    card_onetime checkout no longer prints duplicate card batches.

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'processed')),
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- NOTE: intentionally no policies: only the service role touches this table.

-- Atomic event claim. Returns one row: claimed=true when THIS caller won the
-- insert; claimed=false with the existing row's status/claim time otherwise.
CREATE OR REPLACE FUNCTION public.claim_stripe_event(p_event_id text, p_event_type text)
RETURNS TABLE (claimed boolean, existing_status text, claimed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_at timestamptz;
BEGIN
  INSERT INTO public.processed_stripe_events (event_id, event_type, status)
  VALUES (p_event_id, p_event_type, 'claimed')
  ON CONFLICT (event_id) DO NOTHING;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'claimed'::text, now();
  ELSE
    SELECT pse.status, pse.processed_at INTO v_status, v_at
    FROM public.processed_stripe_events pse
    WHERE pse.event_id = p_event_id;
    RETURN QUERY SELECT false, v_status, v_at;
  END IF;
END;
$$;

-- Only the service role (webhook) may execute the claim function.
REVOKE ALL ON FUNCTION public.claim_stripe_event(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_stripe_event(text, text) FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commissions_stripe_sub_type_unique'
  ) THEN
    ALTER TABLE public.commissions
      ADD CONSTRAINT commissions_stripe_sub_type_unique
      UNIQUE (stripe_subscription_id, commission_type);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personal_card_requests_stripe_session_unique'
  ) THEN
    ALTER TABLE public.personal_card_requests
      ADD CONSTRAINT personal_card_requests_stripe_session_unique
      UNIQUE (stripe_session_id);
  END IF;
END
$$;

-- Residual risk (external): if production already contains duplicate
-- (stripe_subscription_id, commission_type) rows, the ADD CONSTRAINT will fail
-- loudly. De-duplicate first: keep the earliest row per group, e.g.
--   DELETE FROM public.commissions a USING public.commissions b
--   WHERE a.id > b.id
--     AND a.stripe_subscription_id IS NOT DISTINCT FROM b.stripe_subscription_id
--     AND a.commission_type = b.commission_type;
