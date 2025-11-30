-- Create table for tracking ignored AI Coach improvement cards
CREATE TABLE IF NOT EXISTS public.coach_ignored (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  ignored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ignore_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, category)
);

-- Enable RLS
ALTER TABLE public.coach_ignored ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own ignored items
CREATE POLICY "Users can view their own ignored items"
  ON public.coach_ignored
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = coach_ignored.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Policy: Users can insert their own ignored items
CREATE POLICY "Users can insert their own ignored items"
  ON public.coach_ignored
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = coach_ignored.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Policy: Users can delete their own ignored items
CREATE POLICY "Users can delete their own ignored items"
  ON public.coach_ignored
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = coach_ignored.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Index for faster lookups
CREATE INDEX idx_coach_ignored_restaurant_category ON public.coach_ignored(restaurant_id, category);
CREATE INDEX idx_coach_ignored_ignore_until ON public.coach_ignored(ignore_until);