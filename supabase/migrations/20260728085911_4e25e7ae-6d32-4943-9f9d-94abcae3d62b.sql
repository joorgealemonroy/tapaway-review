
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS personal_profile_id uuid REFERENCES public.personal_profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commissions_demo_bonus_unique
  ON public.commissions (rep_id, personal_profile_id)
  WHERE commission_type = 'demo_bonus' AND personal_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commissions_shift_base_daily_unique
  ON public.commissions (rep_id, ((created_at AT TIME ZONE 'UTC')::date))
  WHERE commission_type = 'shift_base';

CREATE UNIQUE INDEX IF NOT EXISTS commissions_closer_pool_period_unique
  ON public.commissions (rep_id, period_label)
  WHERE commission_type = 'closer_pool';

CREATE UNIQUE INDEX IF NOT EXISTS commissions_annual_bounty_unique
  ON public.commissions (rep_id, stripe_subscription_id)
  WHERE commission_type = 'annual_bounty' AND stripe_subscription_id IS NOT NULL;

ALTER TABLE public.rep_compensation_settings
  DROP COLUMN IF EXISTS restaurant_annual_recurring,
  DROP COLUMN IF EXISTS restaurant_monthly_recurring,
  DROP COLUMN IF EXISTS lite_annual_recurring,
  DROP COLUMN IF EXISTS lite_monthly_recurring;

ALTER TABLE public.rep_compensation_settings
  ADD COLUMN IF NOT EXISTS annual_bounty_amount numeric NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS closer_pool_tier1_count int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS closer_pool_tier1_amount numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS closer_pool_tier2_count int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS closer_pool_tier2_amount numeric NOT NULL DEFAULT 600,
  ADD COLUMN IF NOT EXISTS closer_pool_tier3_count int NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS closer_pool_tier3_amount numeric NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS demo_bonus_amount numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS daily_shift_base_amount numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS daily_shift_quota int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS daily_demo_cap int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS quality_gate_min_rate numeric NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS quality_gate_probation_days int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS quality_gate_cap_demos int NOT NULL DEFAULT 20;

-- Helper: recompute closer pool tier for a rep for a given period
CREATE OR REPLACE FUNCTION public.recompute_closer_pool(_rep_id uuid, _period_label text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.rep_compensation_settings%ROWTYPE;
  v_conversions int;
  v_tier_amount numeric := 0;
  v_tier_count int := 0;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  SELECT * INTO v_settings FROM public.rep_compensation_settings LIMIT 1;

  -- Parse period label like 'Nov 2026' back to a month range
  BEGIN
    v_period_start := to_timestamp(_period_label, 'Mon YYYY') AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN
    v_period_start := date_trunc('month', now());
  END;
  v_period_end := v_period_start + interval '1 month';

  SELECT COUNT(*) INTO v_conversions
  FROM public.personal_profiles p
  WHERE p.sales_rep_id = _rep_id
    AND p.subscription_status = 'active'
    AND p.updated_at >= v_period_start
    AND p.updated_at < v_period_end;

  IF v_conversions >= v_settings.closer_pool_tier3_count THEN
    v_tier_count := v_settings.closer_pool_tier3_count;
    v_tier_amount := v_settings.closer_pool_tier3_amount;
  ELSIF v_conversions >= v_settings.closer_pool_tier2_count THEN
    v_tier_count := v_settings.closer_pool_tier2_count;
    v_tier_amount := v_settings.closer_pool_tier2_amount;
  ELSIF v_conversions >= v_settings.closer_pool_tier1_count THEN
    v_tier_count := v_settings.closer_pool_tier1_count;
    v_tier_amount := v_settings.closer_pool_tier1_amount;
  END IF;

  IF v_tier_amount = 0 THEN
    -- No tier met; clean up any stale unpaid closer_pool for this period
    DELETE FROM public.commissions
     WHERE rep_id = _rep_id
       AND period_label = _period_label
       AND commission_type = 'closer_pool'
       AND status IN ('available', 'pending');
    RETURN;
  END IF;

  -- Upsert single row per rep+period (unpaid rows only; do not touch already paid)
  IF EXISTS (
    SELECT 1 FROM public.commissions
     WHERE rep_id = _rep_id
       AND period_label = _period_label
       AND commission_type = 'closer_pool'
       AND status = 'paid'
  ) THEN
    RETURN; -- already paid, don't modify
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.commissions
     WHERE rep_id = _rep_id
       AND period_label = _period_label
       AND commission_type = 'closer_pool'
  ) THEN
    UPDATE public.commissions
       SET amount = v_tier_amount,
           status = 'available',
           note = 'Closer''s Pool tier reached: ' || v_conversions || ' paid conversions'
     WHERE rep_id = _rep_id
       AND period_label = _period_label
       AND commission_type = 'closer_pool'
       AND status <> 'paid';
  ELSE
    INSERT INTO public.commissions (
      rep_id, type, commission_type, amount, status, period_label, points_value, note
    ) VALUES (
      _rep_id, 'bonus', 'closer_pool', v_tier_amount, 'available', _period_label, 0,
      'Closer''s Pool tier reached: ' || v_conversions || ' paid conversions'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_closer_pool(uuid, text) TO service_role;
