-- Custom plans management: active flag + updated_at.
--
-- Locked decision 2026-09-09: custom plans graduate from create-only to a
-- simple management UI (list / create / edit / deactivate) for reuse —
-- enterprise deals, seasonal offers, etc.
--
-- Deactivation is a soft flag, NOT a Stripe delete: the Stripe product/price
-- stay intact so history stays auditable, but make_link refuses deactivated
-- plans and the admin UI hides their pay-link buttons.
--
-- Recurring-subscription only (no one-time prices) — sales-tax safe.

ALTER TABLE public.custom_plans
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.custom_plans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS custom_plans_is_active_idx
  ON public.custom_plans (is_active, created_at DESC);
