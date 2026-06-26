DROP POLICY IF EXISTS "Anyone can subscribe to a restaurant SMS list" ON public.restaurant_sms_subscribers;

CREATE POLICY "Anyone can subscribe to a restaurant SMS list"
ON public.restaurant_sms_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);