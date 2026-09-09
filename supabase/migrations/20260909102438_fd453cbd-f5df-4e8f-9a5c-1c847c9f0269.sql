ALTER TABLE public.custom_plans
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.custom_plans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS custom_plans_is_active_idx
  ON public.custom_plans (is_active, created_at DESC);