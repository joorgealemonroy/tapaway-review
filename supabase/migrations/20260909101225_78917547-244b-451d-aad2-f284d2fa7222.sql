CREATE TABLE IF NOT EXISTS public.admin_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_coupon_id text UNIQUE NOT NULL,
  name text NOT NULL,
  percent_off int,
  amount_off_cents int,
  duration text NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months int,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_coupons_one_discount CHECK (
    (percent_off IS NOT NULL AND amount_off_cents IS NULL) OR
    (percent_off IS NULL AND amount_off_cents IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS admin_coupons_created_at_idx
  ON public.admin_coupons (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_coupons TO authenticated;
GRANT ALL ON public.admin_coupons TO service_role;

ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.admin_coupons;
CREATE POLICY "Admins can manage coupons" ON public.admin_coupons
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());