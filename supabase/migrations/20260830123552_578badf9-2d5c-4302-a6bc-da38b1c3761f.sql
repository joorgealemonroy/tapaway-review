-- Workstream 1: explicit location state on every hub
ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS location_state text NOT NULL DEFAULT 'missing_information',
  ADD COLUMN IF NOT EXISTS location_state_source text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS location_state_set_by uuid,
  ADD COLUMN IF NOT EXISTS location_state_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_state_reason text,
  ADD COLUMN IF NOT EXISTS parent_location_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS match_candidates jsonb,
  ADD COLUMN IF NOT EXISTS match_candidates_expires_at timestamptz;

ALTER TABLE public.business_locations
  DROP CONSTRAINT IF EXISTS business_locations_location_state_check;
ALTER TABLE public.business_locations
  ADD CONSTRAINT business_locations_location_state_check
  CHECK (location_state = ANY (ARRAY[
    'mapped_physical_location','multi_location_master','service_area_business',
    'online_or_personal_hub','missing_information','ambiguous_match',
    'invalid_place_id','archived_or_inactive']));

ALTER TABLE public.business_locations
  DROP CONSTRAINT IF EXISTS business_locations_location_state_source_check;
ALTER TABLE public.business_locations
  ADD CONSTRAINT business_locations_location_state_source_check
  CHECK (location_state_source = ANY (ARRAY['auto','admin']));

CREATE INDEX IF NOT EXISTS business_locations_state_idx
  ON public.business_locations (location_state);
CREATE INDEX IF NOT EXISTS business_locations_parent_idx
  ON public.business_locations (parent_location_id) WHERE parent_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_locations_candidates_exp_idx
  ON public.business_locations (match_candidates_expires_at) WHERE match_candidates_expires_at IS NOT NULL;

-- Workstream 2: persistent admin override, kept separate from detected classification
ALTER TABLE public.hub_link_checks
  ADD COLUMN IF NOT EXISTS admin_review_state text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS admin_review_note text,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_url text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.hub_link_checks
  DROP CONSTRAINT IF EXISTS hub_link_checks_admin_review_state_check;
ALTER TABLE public.hub_link_checks
  ADD CONSTRAINT hub_link_checks_admin_review_state_check
  CHECK (admin_review_state = ANY (ARRAY['none','false_positive','acknowledged']));

ALTER TABLE public.hub_link_checks
  DROP CONSTRAINT IF EXISTS hub_link_checks_classification_check;
ALTER TABLE public.hub_link_checks
  ADD CONSTRAINT hub_link_checks_classification_check
  CHECK (classification IS NULL OR classification = ANY (ARRAY[
    'healthy','redirected','confirmed_broken','server_error',
    'tls_error','timeout','blocked_unverifiable']));

-- Carry any pre-existing false-positive flag into the new persistent override
UPDATE public.hub_link_checks
   SET admin_review_state = 'false_positive'
 WHERE false_positive = true AND admin_review_state = 'none';

CREATE TABLE IF NOT EXISTS public.link_check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  hubs_checked integer NOT NULL DEFAULT 0,
  links_checked integer NOT NULL DEFAULT 0,
  links_total integer NOT NULL DEFAULT 0,
  is_complete boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.link_check_runs TO authenticated;
GRANT ALL ON public.link_check_runs TO service_role;

ALTER TABLE public.link_check_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read link check runs" ON public.link_check_runs;
CREATE POLICY "Admins can read link check runs"
  ON public.link_check_runs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP TRIGGER IF EXISTS update_link_check_runs_updated_at ON public.link_check_runs;
CREATE TRIGGER update_link_check_runs_updated_at
  BEFORE UPDATE ON public.link_check_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();