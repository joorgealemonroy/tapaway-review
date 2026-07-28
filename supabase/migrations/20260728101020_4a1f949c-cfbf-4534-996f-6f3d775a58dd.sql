ALTER TABLE public.personal_profiles 
  ADD COLUMN IF NOT EXISTS review_note text, 
  ADD COLUMN IF NOT EXISTS review_note_at timestamptz;

ALTER TABLE public.personal_profiles 
  DROP CONSTRAINT IF EXISTS personal_profiles_pipeline_status_check;

ALTER TABLE public.personal_profiles 
  ADD CONSTRAINT personal_profiles_pipeline_status_check 
  CHECK (pipeline_status IN ('draft', 'ready_for_review', 'changes_requested', 'card_ready', 'delivered', 'converted', 'inactive'));