
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_rep_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_rep_id uuid;

-- Existing rows are treated as approved (they were created by real owners, not rep demos).
UPDATE public.personal_profiles SET is_approved = true WHERE is_approved IS NULL;

CREATE INDEX IF NOT EXISTS idx_personal_profiles_sales_rep ON public.personal_profiles(sales_rep_id) WHERE sales_rep_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personal_profiles_created_by_rep ON public.personal_profiles(created_by_rep_id) WHERE created_by_rep_id IS NOT NULL;
