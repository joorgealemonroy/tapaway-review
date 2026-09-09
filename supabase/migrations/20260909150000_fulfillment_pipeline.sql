-- Fulfillment pipeline (workstream): add the 'activated' stage to the
-- personal_profiles pipeline, add per-stage timestamps so pipeline_status is
-- the single source of truth, backfill/sync from the print pipeline, and
-- create the admin-only rep_payments ledger (rep $5/demo tally).
--
-- All statements are idempotent (safe to run more than once).

-- ─────────────────────────────────────────────────────────────
-- 1. pipeline_status CHECK: add 'activated'
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.personal_profiles
    DROP CONSTRAINT IF EXISTS personal_profiles_pipeline_status_check;
EXCEPTION WHEN undefined_object THEN
  -- constraint name drifted; fall through to the existence check below
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

-- ─────────────────────────────────────────────────────────────
-- 2. Stage timestamp / actor columns (mirrors print_*_at/by pattern)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 3. Backfill / sync: print_status → pipeline_status (pipeline_status wins
--    as the single source of truth for the fulfillment board)
-- ─────────────────────────────────────────────────────────────

-- print_status='printed' but pipeline lagging behind → 'card_ready'
UPDATE public.personal_profiles
SET
  pipeline_status = 'card_ready',
  printed_at = COALESCE(printed_at, print_printed_at),
  printed_by = COALESCE(printed_by, print_printed_by)
WHERE print_status = 'printed'
  AND pipeline_status NOT IN ('card_ready', 'activated', 'delivered', 'converted', 'inactive');

-- print_status='delivered' but pipeline lagging behind → 'delivered'
UPDATE public.personal_profiles
SET
  pipeline_status = 'delivered',
  delivered_at = COALESCE(delivered_at, print_delivered_at),
  delivered_by = COALESCE(delivered_by, print_delivered_by),
  printed_at   = COALESCE(printed_at, print_printed_at)
WHERE print_status = 'delivered'
  AND pipeline_status NOT IN ('delivered', 'converted', 'inactive');

-- Fill stage timestamps where the pipeline is already past a stage but the
-- stamp is missing (uses the print audit trail when it exists, else created_at).
UPDATE public.personal_profiles
SET printed_at = COALESCE(print_printed_at, created_at)
WHERE pipeline_status IN ('card_ready', 'activated', 'delivered', 'converted')
  AND printed_at IS NULL;

UPDATE public.personal_profiles
SET delivered_at = COALESCE(print_delivered_at, created_at)
WHERE pipeline_status IN ('delivered', 'converted')
  AND delivered_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. rep_payments ledger (admin-only)
-- ─────────────────────────────────────────────────────────────
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

ALTER TABLE public.rep_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage rep payments" ON public.rep_payments;
CREATE POLICY "Admins can manage rep payments" ON public.rep_payments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed: the $500 payment Jorge made to Diego on 2026-09-09.
-- Matches the sales_reps row by name (case-insensitive); does nothing if no
-- Diego row exists or if this exact seed row already exists — in that case
-- use the manual snippet in FULFILLMENT-PIPELINE.md to insert it.
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
