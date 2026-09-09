GRANT INSERT ON public.support_requests TO anon;
GRANT SELECT, INSERT ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;