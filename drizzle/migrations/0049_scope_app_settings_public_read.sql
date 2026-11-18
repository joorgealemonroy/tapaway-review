DROP POLICY IF EXISTS "Public can read app_settings" ON public.app_settings;
CREATE POLICY "Public can read global app_settings"
  ON public.app_settings FOR SELECT TO anon, authenticated
  USING (id = 'global');