-- Allow anyone to read app_settings (paywall toggle needs to be readable before signup)
CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings
  FOR SELECT
  USING (true);