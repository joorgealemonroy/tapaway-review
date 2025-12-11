-- Allow anyone to read demo restaurants (is_demo_account = true)
CREATE POLICY "Anyone can view demo restaurants"
ON public.restaurants
FOR SELECT
USING (is_demo_account = true);