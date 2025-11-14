
-- Add owner_name field to restaurants table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS owner_name TEXT;
