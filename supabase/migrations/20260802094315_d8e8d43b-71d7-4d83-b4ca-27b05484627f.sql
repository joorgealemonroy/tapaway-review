UPDATE public.personal_profiles
SET pipeline_status = 'ready_for_review',
    submitted_for_review_at = now()
WHERE pipeline_status = 'changes_requested'
  AND is_approved = false;