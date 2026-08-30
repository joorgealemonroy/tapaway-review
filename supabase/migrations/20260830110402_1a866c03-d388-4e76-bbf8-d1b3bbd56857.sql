CREATE OR REPLACE FUNCTION public.sync_business_locations_admin()
RETURNS TABLE(inserted integer, updated integer)
LANGUAGE sql
SET search_path = ''
AS $$ SELECT * FROM private.sync_business_locations(); $$;

REVOKE ALL ON FUNCTION public.sync_business_locations_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_business_locations_admin() FROM anon;
REVOKE ALL ON FUNCTION public.sync_business_locations_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_business_locations_admin() TO service_role;