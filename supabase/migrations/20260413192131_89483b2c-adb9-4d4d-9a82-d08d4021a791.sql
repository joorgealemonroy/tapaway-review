
-- Create creator_availability table
CREATE TABLE public.creator_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, day_of_week)
);

ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own availability
CREATE POLICY "Creators can manage own availability"
  ON public.creator_availability FOR ALL
  TO authenticated
  USING (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()))
  WITH CHECK (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

-- Anyone can read availability (needed for booking calendar)
CREATE POLICY "Public can view availability"
  ON public.creator_availability FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins full access
CREATE POLICY "Admins full access creator_availability"
  ON public.creator_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Create bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.creator_products(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  buyer_email text,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a booking (pending reservation)
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read bookings for slot-blocking
CREATE POLICY "Public can view bookings for slot blocking"
  ON public.bookings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Creators can update their own bookings
CREATE POLICY "Creators can update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

-- Admins full access
CREATE POLICY "Admins full access bookings"
  ON public.bookings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add updated_at trigger
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to creator_products
ALTER TABLE public.creator_products
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN booking_url text;
