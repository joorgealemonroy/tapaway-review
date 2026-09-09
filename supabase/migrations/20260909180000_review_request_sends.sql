-- Review-request SMS dedup log (public.review_request_sends).
-- Hard rule (Jorge): a review-request SMS goes to a given person at most ONCE
-- per business, ever. The send-mass-sms edge function checks this table before
-- sending and records every accepted send here. Idempotent; safe to re-run.
--
-- Phone normalization (exact scheme, mirrored in send-mass-sms/index.ts):
--   1. Strip every non-digit character.
--   2. If the result is 10 digits, prepend "1" (assume North American).
--   3. If the result is 11 digits starting with "1", keep it.
--   4. Otherwise keep the digits as-is (international / unusual — no guessing).
--   5. Prefix with "+" (E.164-ish).
-- phone_hash = lowercase hex SHA-256 of the normalized phone string.
-- No salt/pepper: salts would break cross-check consistency between the
-- edge function and any future RPC/UI lookup, and a rotating pepper would
-- silently break dedup (re-texting people — the exact thing this prevents).
-- Note this is an anti-duplicate key, not a privacy shield: phone numbers are
-- low-entropy, so the hashes are only visible to the owning business (RLS)
-- and admins, never to other businesses or the public.
--
-- Backfill: nothing to backfill from — sms_campaigns / restaurant_sms_campaigns
-- only store aggregate counts (no per-phone history), and trial-followup's log
-- (trial_nurture_log) records texts to business OWNERS, not customers. Dedup
-- therefore starts at deploy time: the first post-deploy review-request send
-- seeds the log, and repeats are blocked from there on.

CREATE TABLE IF NOT EXISTS public.review_request_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Exactly one of these is set (CHECK below): which business sent it.
  profile_id uuid REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_hash text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  -- Which channel recorded it; 'send-mass-sms' today, future senders add theirs.
  sent_via text NOT NULL DEFAULT 'send-mass-sms',
  -- Link back to the campaign row that produced this send (nullable so a
  -- sender without a campaign row can still log).
  campaign_id uuid NULL,
  CONSTRAINT review_request_sends_owner_check CHECK (
    (profile_id IS NULL) <> (restaurant_id IS NULL)
  )
);

-- One hash per phone per business: the dedup guarantee. Partial unique indexes
-- (rather than one composite) because exactly one owner column is set per row.
CREATE UNIQUE INDEX IF NOT EXISTS review_request_sends_profile_phone_uniq
  ON public.review_request_sends (profile_id, phone_hash)
  WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_request_sends_restaurant_phone_uniq
  ON public.review_request_sends (restaurant_id, phone_hash)
  WHERE restaurant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS review_request_sends_sent_at_idx
  ON public.review_request_sends (sent_at DESC);

ALTER TABLE public.review_request_sends ENABLE ROW LEVEL SECURITY;

-- Owners see their own business's rows (read-only; writes go through the
-- service-role edge function only — same convention as sms_campaigns).
DROP POLICY IF EXISTS "Owners view own review request sends" ON public.review_request_sends;
CREATE POLICY "Owners view own review request sends" ON public.review_request_sends
  FOR SELECT TO authenticated
  USING (
    (
      profile_id IS NOT NULL
      AND profile_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid())
    )
    OR (
      restaurant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = review_request_sends.restaurant_id
          AND r.owner_id = auth.uid()
      )
    )
  );

-- Admins see everything (read + write, e.g. manual corrections).
DROP POLICY IF EXISTS "Admins full access review request sends" ON public.review_request_sends;
CREATE POLICY "Admins full access review request sends" ON public.review_request_sends
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No INSERT/UPDATE/DELETE policies for owners: rows are written only via the
-- service-role edge function (check-then-record in send-mass-sms).

GRANT SELECT ON public.review_request_sends TO authenticated;
GRANT ALL ON public.review_request_sends TO service_role;
