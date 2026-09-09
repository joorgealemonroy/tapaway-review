CREATE TABLE IF NOT EXISTS public.review_request_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_hash text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_via text NOT NULL DEFAULT 'send-mass-sms',
  campaign_id uuid NULL,
  CONSTRAINT review_request_sends_owner_check CHECK (
    (profile_id IS NULL) <> (restaurant_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS review_request_sends_profile_phone_uniq
  ON public.review_request_sends (profile_id, phone_hash)
  WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_request_sends_restaurant_phone_uniq
  ON public.review_request_sends (restaurant_id, phone_hash)
  WHERE restaurant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS review_request_sends_sent_at_idx
  ON public.review_request_sends (sent_at DESC);

ALTER TABLE public.review_request_sends ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Admins full access review request sends" ON public.review_request_sends;
CREATE POLICY "Admins full access review request sends" ON public.review_request_sends
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.review_request_sends TO authenticated;
GRANT ALL ON public.review_request_sends TO service_role;