
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
ALTER TABLE public.commissions ADD CONSTRAINT commissions_status_check
  CHECK (status = ANY (ARRAY['pending','available','trial_pending','paid','voided','clawed_back','locked_quality_gate']));

INSERT INTO public.commissions (rep_id, personal_profile_id, type, commission_type, amount, status, period_label, points_value, note)
SELECT
  p.sales_rep_id,
  p.id,
  'bonus',
  'demo_bonus',
  5,
  'available',
  to_char(COALESCE(p.submitted_for_review_at, p.updated_at), 'Mon YYYY'),
  0,
  'Backfilled: approved demo bonus'
FROM public.personal_profiles p
WHERE p.is_approved = true
  AND p.sales_rep_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.commissions c
    WHERE c.rep_id = p.sales_rep_id
      AND c.personal_profile_id = p.id
      AND c.commission_type = 'demo_bonus'
  );
