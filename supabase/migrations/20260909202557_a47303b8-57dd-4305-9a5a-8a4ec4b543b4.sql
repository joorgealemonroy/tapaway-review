DROP POLICY IF EXISTS "Anyone can insert support requests" ON public.support_requests;
CREATE POLICY "Public can submit support requests"
ON public.support_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (email IS NOT NULL AND btrim(email) <> '' AND request_type IS NOT NULL);