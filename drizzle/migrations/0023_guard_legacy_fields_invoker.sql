ALTER FUNCTION public.guard_legacy_fields() SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.guard_legacy_fields() TO authenticated, anon;