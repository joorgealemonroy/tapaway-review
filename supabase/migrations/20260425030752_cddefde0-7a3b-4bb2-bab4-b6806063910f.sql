CREATE POLICY "Admins can view all email captures"
  ON public.personal_email_captures
  FOR SELECT
  USING (public.is_admin());