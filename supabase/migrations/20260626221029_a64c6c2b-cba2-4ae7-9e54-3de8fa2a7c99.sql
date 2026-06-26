GRANT SELECT ON public.personal_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_links TO authenticated;
GRANT ALL ON public.personal_links TO service_role;

GRANT SELECT ON public.personal_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_blocks TO authenticated;
GRANT ALL ON public.personal_blocks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_profiles TO authenticated;
GRANT ALL ON public.personal_profiles TO service_role;