ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS legacy_allowance_granted_at timestamptz, ADD COLUMN IF NOT EXISTS legacy_allowance_source text, ADD COLUMN IF NOT EXISTS legacy_allowance_key text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS legacy_allowance_granted_at timestamptz, ADD COLUMN IF NOT EXISTS legacy_allowance_source text, ADD COLUMN IF NOT EXISTS legacy_allowance_key text;

CREATE TABLE IF NOT EXISTS public.legacy_allowance_entitlements (
  relationship_key text PRIMARY KEY,
  granted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'pre_payment_first_migration',
  record_count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.legacy_allowance_entitlements TO service_role;
GRANT SELECT ON public.legacy_allowance_entitlements TO authenticated;
ALTER TABLE public.legacy_allowance_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read legacy entitlements" ON public.legacy_allowance_entitlements FOR SELECT TO authenticated USING (public.is_admin());

-- One-time fixed cohort (idempotent; never flips true to false).
WITH e AS (
  SELECT coalesce(stripe_subscription_id, stripe_customer_id, user_id::text, id::text) rel FROM public.personal_profiles WHERE subscription_status IN ('active','trialing')
  UNION ALL
  SELECT coalesce(stripe_subscription_id, stripe_customer_id, owner_id::text, id::text) FROM public.restaurants WHERE subscription_status IN ('active','trialing')
)
INSERT INTO public.legacy_allowance_entitlements (relationship_key, record_count)
SELECT rel, count(*) FROM e GROUP BY rel
ON CONFLICT (relationship_key) DO NOTHING;

UPDATE public.personal_profiles SET legacy_allowance = true, legacy_allowance_granted_at = now(), legacy_allowance_source = 'pre_payment_first_migration',
  legacy_allowance_key = coalesce(stripe_subscription_id, stripe_customer_id, user_id::text, id::text)
WHERE subscription_status IN ('active','trialing') AND legacy_allowance IS DISTINCT FROM true;
UPDATE public.restaurants SET legacy_allowance = true, legacy_allowance_granted_at = now(), legacy_allowance_source = 'pre_payment_first_migration',
  legacy_allowance_key = coalesce(stripe_subscription_id, stripe_customer_id, owner_id::text, id::text)
WHERE subscription_status IN ('active','trialing') AND legacy_allowance IS DISTINCT FROM true;