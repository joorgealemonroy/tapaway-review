-- 1. Add new columns to commissions table
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS clawback_until timestamptz,
  ADD COLUMN IF NOT EXISTS points_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- 2. Add tiered rate columns to rep_compensation_settings
ALTER TABLE public.rep_compensation_settings
  ADD COLUMN IF NOT EXISTS restaurant_annual_upfront numeric NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS restaurant_annual_recurring numeric NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS restaurant_monthly_upfront numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS restaurant_monthly_recurring numeric NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS lite_annual_upfront numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS lite_annual_recurring numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS lite_monthly_upfront numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS lite_monthly_recurring numeric NOT NULL DEFAULT 1.50,
  ADD COLUMN IF NOT EXISTS bonus_point_threshold numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS restaurant_point_value numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS lite_point_value numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS clawback_days integer NOT NULL DEFAULT 60;

-- 3. Update bonus_amount default to 600
ALTER TABLE public.rep_compensation_settings
  ALTER COLUMN bonus_amount SET DEFAULT 600;

-- Update existing row bonus_amount if it's still the old default
UPDATE public.rep_compensation_settings
  SET bonus_amount = 600
  WHERE bonus_amount = 500;

-- 4. Add index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_commissions_stripe_sub_id
  ON public.commissions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 5. Replace the check_and_create_bonus trigger function
CREATE OR REPLACE FUNCTION public.check_and_create_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_points NUMERIC;
  v_bonus_count INTEGER;
  v_settings RECORD;
  v_expected_bonuses INTEGER;
BEGIN
  -- Only process upfront commissions with actual points
  IF NEW.commission_type != 'upfront' OR NEW.points_value <= 0 THEN
    -- Also handle legacy 'close' type for backward compat
    IF NEW.type != 'close' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get compensation settings
  SELECT * INTO v_settings FROM public.rep_compensation_settings LIMIT 1;

  -- Sum points from upfront commissions for this rep in this period
  SELECT COALESCE(SUM(points_value), 0) INTO v_total_points
  FROM public.commissions
  WHERE rep_id = NEW.rep_id
    AND period_label = NEW.period_label
    AND ((commission_type = 'upfront' AND points_value > 0) OR type = 'close');

  -- Count existing bonus commissions for this rep in this period
  SELECT COUNT(*) INTO v_bonus_count
  FROM public.commissions
  WHERE rep_id = NEW.rep_id
    AND period_label = NEW.period_label
    AND (commission_type = 'bonus' OR type = 'bonus');

  -- Calculate expected number of bonuses based on point threshold
  IF v_settings.bonus_point_threshold > 0 THEN
    v_expected_bonuses := FLOOR(v_total_points / v_settings.bonus_point_threshold);
  ELSE
    v_expected_bonuses := 0;
  END IF;

  -- Create bonus if needed
  IF v_expected_bonuses > v_bonus_count THEN
    INSERT INTO public.commissions (rep_id, type, commission_type, amount, status, period_label, points_value, note)
    VALUES (
      NEW.rep_id,
      'bonus',
      'bonus',
      v_settings.bonus_amount,
      'available',
      NEW.period_label,
      0,
      'Volume bonus: ' || v_total_points || ' points reached ' || v_settings.bonus_point_threshold || ' threshold'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. Ensure the trigger exists on commissions
DROP TRIGGER IF EXISTS trg_check_bonus ON public.commissions;
CREATE TRIGGER trg_check_bonus
  AFTER INSERT OR UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_bonus();