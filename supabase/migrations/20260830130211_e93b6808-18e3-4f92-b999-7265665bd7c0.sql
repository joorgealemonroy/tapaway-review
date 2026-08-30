ALTER TABLE public.hub_link_checks
  DROP CONSTRAINT IF EXISTS hub_link_checks_classification_check;
ALTER TABLE public.hub_link_checks
  ADD CONSTRAINT hub_link_checks_classification_check
  CHECK (classification IS NULL OR classification = ANY (ARRAY[
    'healthy','redirected','confirmed_broken','server_error',
    'tls_error','timeout','blocked_unverifiable','malformed']));