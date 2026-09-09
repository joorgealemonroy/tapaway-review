CREATE TABLE IF NOT EXISTS public.custom_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  amount_cents int NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 1000000),
  stripe_product_id text NOT NULL,
  stripe_price_id text NOT NULL,
  trial_days int NOT NULL DEFAULT 0 CHECK (trial_days >= 0 AND trial_days <= 90),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_plans_name_lower_uniq
  ON public.custom_plans (lower(name));

CREATE INDEX IF NOT EXISTS custom_plans_created_at_idx
  ON public.custom_plans (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_plans TO authenticated;
GRANT ALL ON public.custom_plans TO service_role;

ALTER TABLE public.custom_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage custom plans" ON public.custom_plans;
CREATE POLICY "Admins can manage custom plans" ON public.custom_plans
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());