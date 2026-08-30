-- Additive only: hydration state, link classification, consent records.

ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS hydration_status text,
  ADD COLUMN IF NOT EXISTS hydration_error text,
  ADD COLUMN IF NOT EXISTS hydration_attempted_at timestamp with time zone;

ALTER TABLE public.hub_link_checks
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS false_positive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS false_positive_note text;

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key text,
  user_id uuid,
  policy_version text NOT NULL,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  advertising boolean NOT NULL DEFAULT false,
  gpc_detected boolean NOT NULL DEFAULT false,
  action text NOT NULL DEFAULT 'set',
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read consent records" ON public.consent_records;
CREATE POLICY "Admins read consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read their own consent records" ON public.consent_records;
CREATE POLICY "Users read their own consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS consent_records_visitor_idx
  ON public.consent_records (visitor_key, created_at DESC);