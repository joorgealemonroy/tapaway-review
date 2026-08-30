GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_locations TO authenticated;
GRANT ALL ON public.business_locations TO service_role;
GRANT ALL ON public.places_api_log TO service_role;
GRANT ALL ON public.location_status_history TO service_role;
GRANT ALL ON public.location_visits TO service_role;