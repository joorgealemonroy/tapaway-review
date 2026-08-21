ALTER TABLE public.personal_profiles
  DROP CONSTRAINT IF EXISTS personal_profiles_pipeline_status_check;

ALTER TABLE public.personal_profiles
  ADD CONSTRAINT personal_profiles_pipeline_status_check
  CHECK (pipeline_status = ANY (ARRAY[
    'draft'::text,
    'ready_for_review'::text,
    'changes_requested'::text,
    'approved'::text,
    'card_ready'::text,
    'delivered'::text,
    'converted'::text,
    'inactive'::text
  ]));