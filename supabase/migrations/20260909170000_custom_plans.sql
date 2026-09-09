-- Custom Plan Builder: stores custom-priced recurring plans created by Jorge
-- (public.custom_plans). Idempotent; safe to re-run.
--
-- Plans are subscription-recurring only (no one-time prices) to keep the
-- no-activation-fee / no-sales-tax posture.

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

-- Plan names are unique case-insensitively: a double-tap in the admin UI
-- returns the existing plan instead of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS custom_plans_name_lower_uniq
  ON public.custom_plans (lower(name));

CREATE INDEX IF NOT EXISTS custom_plans_created_at_idx
  ON public.custom_plans (created_at DESC);

ALTER TABLE public.custom_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage custom plans" ON public.custom_plans;
CREATE POLICY "Admins can manage custom plans" ON public.custom_plans
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
