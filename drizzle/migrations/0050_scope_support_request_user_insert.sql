DROP POLICY IF EXISTS "Users can insert support requests" ON public.support_requests;
CREATE POLICY "Users can insert their own support requests"
  ON public.support_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());