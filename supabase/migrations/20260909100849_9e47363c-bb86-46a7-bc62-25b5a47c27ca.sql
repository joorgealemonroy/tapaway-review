DO $$
BEGIN
  ALTER TABLE public.personal_profiles
    DROP CONSTRAINT IF EXISTS personal_profiles_pipeline_status_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.personal_profiles'::regclass
    AND pg_get_constraintdef(oid) LIKE '%pipeline_status%'
    AND contype = 'c'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.personal_profiles DROP CONSTRAINT %I',
      cname
    );
  END IF;

  ALTER TABLE public.personal_profiles
    ADD CONSTRAINT personal_profiles_pipeline_status_check
    CHECK (pipeline_status IN (
      'draft',
      'ready_for_review',
      'changes_requested',
      'approved',
      'card_ready',
      'activated',
      'delivered',
      'converted',
      'inactive'
    ));
END $$;

ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by  uuid,
  ADD COLUMN IF NOT EXISTS printed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS printed_by   uuid,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by uuid,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_by uuid,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

UPDATE public.personal_profiles
SET
  pipeline_status = 'card_ready',
  printed_at = COALESCE(printed_at, print_printed_at),
  printed_by = COALESCE(printed_by, print_printed_by)
WHERE print_status = 'printed'
  AND pipeline_status NOT IN ('card_ready', 'activated', 'delivered', 'converted', 'inactive');

UPDATE public.personal_profiles
SET
  pipeline_status = 'delivered',
  delivered_at = COALESCE(delivered_at, print_delivered_at),
  delivered_by = COALESCE(delivered_by, print_delivered_by),
  printed_at   = COALESCE(printed_at, print_printed_at)
WHERE print_status = 'delivered'
  AND pipeline_status NOT IN ('delivered', 'converted', 'inactive');

UPDATE public.personal_profiles
SET printed_at = COALESCE(print_printed_at, created_at)
WHERE pipeline_status IN ('card_ready', 'activated', 'delivered', 'converted')
  AND printed_at IS NULL;

UPDATE public.personal_profiles
SET delivered_at = COALESCE(print_delivered_at, created_at)
WHERE pipeline_status IN ('delivered', 'converted')
  AND delivered_at IS NULL;

CREATE TABLE IF NOT EXISTS public.rep_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL REFERENCES public.sales_reps(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS rep_payments_sales_rep_id_idx
  ON public.rep_payments (sales_rep_id, paid_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_payments TO authenticated;
GRANT ALL ON public.rep_payments TO service_role;

ALTER TABLE public.rep_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage rep payments" ON public.rep_payments;
CREATE POLICY "Admins can manage rep payments" ON public.rep_payments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.rep_payments (sales_rep_id, amount, paid_at, note)
SELECT r.id, 500, '2026-09-09'::date, 'paid 2026-09-09'
FROM public.sales_reps r
WHERE r.name ILIKE '%diego%'
  AND NOT EXISTS (
    SELECT 1 FROM public.rep_payments p
    WHERE p.sales_rep_id = r.id
      AND p.amount = 500
      AND p.paid_at::date = '2026-09-09'::date
  );