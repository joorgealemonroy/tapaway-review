-- Safety net: enforce exactly one shift_base per rep per UTC day
CREATE UNIQUE INDEX IF NOT EXISTS unique_daily_shift_base
ON public.commissions (rep_id, ((created_at AT TIME ZONE 'UTC')::date))
WHERE commission_type = 'shift_base';

CREATE OR REPLACE FUNCTION public.award_daily_base_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quota int;
  _base_amount numeric;
  _demo_count int;
  _day date;
BEGIN
  IF NEW.commission_type IS DISTINCT FROM 'demo_bonus' THEN
    RETURN NEW;
  END IF;

  SELECT daily_shift_quota, daily_shift_base_amount
    INTO _quota, _base_amount
    FROM public.rep_compensation_settings
   LIMIT 1;

  IF _quota IS NULL OR _base_amount IS NULL OR _quota <= 0 THEN
    RETURN NEW;
  END IF;

  _day := (NEW.created_at AT TIME ZONE 'UTC')::date;

  SELECT count(*) INTO _demo_count
    FROM public.commissions
   WHERE rep_id = NEW.rep_id
     AND commission_type = 'demo_bonus'
     AND (created_at AT TIME ZONE 'UTC')::date = _day;

  IF _demo_count >= _quota THEN
    INSERT INTO public.commissions (
      rep_id, type, commission_type, amount, status, period_label, points_value, created_at, note
    ) VALUES (
      NEW.rep_id,
      'bonus',
      'shift_base',
      _base_amount,
      'available',
      to_char(NEW.created_at AT TIME ZONE 'UTC', 'Mon YYYY'),
      0,
      NEW.created_at,
      'Daily shift base - ' || _demo_count || ' approved demos'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_daily_base ON public.commissions;
CREATE TRIGGER trg_award_daily_base
AFTER INSERT ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.award_daily_base_trigger();

-- Backfill missing daily base rows
WITH daily_stats AS (
  SELECT
    rep_id,
    (created_at AT TIME ZONE 'UTC')::date AS earned_date,
    COUNT(*) FILTER (WHERE commission_type = 'demo_bonus') AS demo_count,
    COUNT(*) FILTER (WHERE commission_type = 'shift_base') AS base_count
  FROM public.commissions
  GROUP BY rep_id, (created_at AT TIME ZONE 'UTC')::date
),
settings AS (
  SELECT daily_shift_quota, daily_shift_base_amount
  FROM public.rep_compensation_settings
  LIMIT 1
)
INSERT INTO public.commissions (
  rep_id, type, commission_type, amount, status, period_label, points_value, created_at, note
)
SELECT
  ds.rep_id,
  'bonus',
  'shift_base',
  s.daily_shift_base_amount,
  'available',
  to_char(ds.earned_date, 'Mon YYYY'),
  0,
  (ds.earned_date + interval '23 hours 59 minutes') AT TIME ZONE 'UTC',
  'Daily shift base - historical backfill (' || ds.demo_count || ' approved demos)'
FROM daily_stats ds
CROSS JOIN settings s
WHERE ds.demo_count >= s.daily_shift_quota
  AND ds.base_count = 0
ON CONFLICT DO NOTHING;