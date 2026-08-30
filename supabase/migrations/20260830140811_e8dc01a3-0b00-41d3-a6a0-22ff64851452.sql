-- 1. Additive column: the California business day a commission was earned.
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS earned_on date;

-- 2. Backfill. Demo bonuses derive from the linked profile's submission
--    timestamp in Pacific time; everything else falls back to created_at.
UPDATE public.commissions c
   SET earned_on = (p.created_at AT TIME ZONE 'America/Los_Angeles')::date
  FROM public.personal_profiles p
 WHERE p.id = c.personal_profile_id
   AND c.commission_type = 'demo_bonus'
   AND c.earned_on IS NULL;

UPDATE public.commissions
   SET earned_on = (created_at AT TIME ZONE 'America/Los_Angeles')::date
 WHERE earned_on IS NULL;

-- 3. Uniqueness backstops (audited beforehand: zero existing duplicates).
CREATE UNIQUE INDEX IF NOT EXISTS commissions_demo_bonus_one_per_profile
  ON public.commissions (personal_profile_id)
  WHERE commission_type = 'demo_bonus' AND personal_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commissions_shift_base_one_per_rep_day
  ON public.commissions (rep_id, earned_on)
  WHERE commission_type = 'shift_base';

CREATE INDEX IF NOT EXISTS commissions_rep_type_earned_on
  ON public.commissions (rep_id, commission_type, earned_on);

-- 4. Single authority for awarding. The old approval-time trigger is retired
--    so the daily base has exactly one creation path.
DROP TRIGGER IF EXISTS trg_award_daily_base ON public.commissions;

CREATE OR REPLACE FUNCTION private.award_demo_commission(_personal_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _profile        record;
  _rep_id         uuid;
  _earned_on      date;
  _period_label   text;
  _cap            int;
  _bonus_amount   numeric;
  _quota          int;
  _base_amount    numeric;
  _probation_days int;
  _min_rate       numeric;
  _gate_cap       int;
  _position       int;
  _rep            record;
  _rep_age_days   numeric;
  _approved30     int;
  _converted30    int;
  _rate           numeric;
  _gate_active    boolean;
  _status         text;
  _note           text;
  _existing       record;
  _demo_count     int;
BEGIN
  SELECT id, sales_rep_id, is_approved, full_name, username, created_at
    INTO _profile
    FROM public.personal_profiles
   WHERE id = _personal_profile_id;

  IF _profile.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'profile not found');
  END IF;
  IF _profile.sales_rep_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no rep');
  END IF;
  IF NOT _profile.is_approved THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not approved yet');
  END IF;

  _rep_id    := _profile.sales_rep_id;
  -- Earned workday = California business day of the SUBMISSION, never approval.
  _earned_on := (_profile.created_at AT TIME ZONE 'America/Los_Angeles')::date;
  _period_label := to_char(_earned_on, 'Mon YYYY');

  -- Serialise all awarding for this rep + earned workday.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(_rep_id::text || ':' || _earned_on::text, 0)
  );

  -- Idempotent: one demo commission per source profile.
  SELECT id, status, amount INTO _existing
    FROM public.commissions
   WHERE commission_type = 'demo_bonus'
     AND personal_profile_id = _personal_profile_id;
  IF _existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'already_awarded', true,
      'status', _existing.status, 'earned_on', _earned_on
    );
  END IF;

  SELECT daily_demo_cap, demo_bonus_amount, daily_shift_quota,
         daily_shift_base_amount, quality_gate_probation_days,
         quality_gate_min_rate, quality_gate_cap_demos
    INTO _cap, _bonus_amount, _quota, _base_amount,
         _probation_days, _min_rate, _gate_cap
    FROM public.rep_compensation_settings
   LIMIT 1;

  _cap            := COALESCE(_cap, 50);
  _bonus_amount   := COALESCE(_bonus_amount, 5);
  _quota          := COALESCE(_quota, 10);
  _base_amount    := COALESCE(_base_amount, 50);
  _probation_days := COALESCE(_probation_days, 30);
  _min_rate       := COALESCE(_min_rate, 0.05);
  _gate_cap       := COALESCE(_gate_cap, 20);

  -- Deterministic position: computed over ALL of this rep's submissions for
  -- that Pacific workday, ordered by submission time then id. Approval order
  -- can never move another demo's position.
  SELECT pos INTO _position FROM (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS pos
      FROM public.personal_profiles
     WHERE sales_rep_id = _rep_id
       AND (created_at AT TIME ZONE 'America/Los_Angeles')::date = _earned_on
  ) ranked WHERE ranked.id = _personal_profile_id;

  -- Quality gate.
  SELECT created_at, quality_gate_exempt INTO _rep
    FROM public.sales_reps WHERE id = _rep_id;
  _rep_age_days := COALESCE(
    EXTRACT(epoch FROM (now() - _rep.created_at)) / 86400, 0);

  SELECT count(*) INTO _approved30 FROM public.personal_profiles
   WHERE sales_rep_id = _rep_id AND is_approved
     AND created_at >= now() - interval '30 days';
  SELECT count(*) INTO _converted30 FROM public.personal_profiles
   WHERE sales_rep_id = _rep_id AND subscription_status = 'active'
     AND updated_at >= now() - interval '30 days';
  _rate := CASE WHEN _approved30 > 0 THEN _converted30::numeric / _approved30 ELSE 0 END;
  _gate_active := NOT COALESCE(_rep.quality_gate_exempt, false)
                  AND (_rep_age_days < _probation_days OR _rate < _min_rate);

  _status := 'available';
  _note   := 'Demo bonus for ' || COALESCE(NULLIF(_profile.full_name, ''), _profile.username, 'demo');

  IF _position > _cap THEN
    _status := 'voided';
    _note   := 'Skipped: daily cap of ' || _cap || ' demos reached on ' || _earned_on;
  ELSIF _gate_active AND _position > _gate_cap THEN
    _status := 'locked_quality_gate';
    _note   := 'Locked: unlock $' || ((_cap - _gate_cap) * _bonus_amount)
               || ' more/day by reaching ' || round(_min_rate * 100) || '% conversion rate';
  END IF;

  INSERT INTO public.commissions (
    rep_id, personal_profile_id, type, commission_type, amount,
    status, period_label, points_value, note, earned_on
  ) VALUES (
    _rep_id, _personal_profile_id, 'bonus', 'demo_bonus',
    CASE WHEN _status = 'voided' THEN 0 ELSE _bonus_amount END,
    _status, _period_label, 0, _note, _earned_on
  )
  ON CONFLICT DO NOTHING;

  -- Daily base: this routine is the only creation path.
  SELECT count(*) INTO _demo_count FROM public.commissions
   WHERE rep_id = _rep_id AND commission_type = 'demo_bonus'
     AND earned_on = _earned_on;

  IF _demo_count >= _quota THEN
    INSERT INTO public.commissions (
      rep_id, type, commission_type, amount, status,
      period_label, points_value, note, earned_on
    ) VALUES (
      _rep_id, 'bonus', 'shift_base', _base_amount, 'available',
      _period_label, 0,
      'Daily shift base - ' || _demo_count || ' approved demos on ' || _earned_on,
      _earned_on
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'awarded', _status, 'earned_on', _earned_on,
    'position', _position, 'daily_progress', _demo_count,
    'quality_gate_active', _gate_active, 'period_label', _period_label,
    'note', _note
  );
END;
$$;

REVOKE ALL ON FUNCTION private.award_demo_commission(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.award_demo_commission(uuid) TO service_role;