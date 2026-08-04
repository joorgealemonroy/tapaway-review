ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS place_lat double precision,
  ADD COLUMN IF NOT EXISTS place_lng double precision;