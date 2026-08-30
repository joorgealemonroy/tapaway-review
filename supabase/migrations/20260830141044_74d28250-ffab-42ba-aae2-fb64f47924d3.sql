CREATE OR REPLACE FUNCTION public.award_demo_commission(_personal_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.award_demo_commission(_personal_profile_id);
END;
$$;

REVOKE ALL ON FUNCTION public.award_demo_commission(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_demo_commission(uuid) TO service_role;