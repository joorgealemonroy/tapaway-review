
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS website_url text;

CREATE INDEX IF NOT EXISTS restaurants_created_by_idx ON public.restaurants(created_by);
CREATE INDEX IF NOT EXISTS restaurants_expires_at_idx ON public.restaurants(expires_at);

-- Rep-created demo hubs: reps manage rows they created
CREATE POLICY "Reps can view their created demo hubs"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Reps can insert demo hubs they create"
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() AND expires_at IS NOT NULL);

CREATE POLICY "Reps can update their created demo hubs"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Reps can delete their created demo hubs"
  ON public.restaurants
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
