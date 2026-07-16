
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS business_phone text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS background_theme_style text NOT NULL DEFAULT 'default';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#00C2FF';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#0F172A';

-- Backfill: keep existing hubs counted as approved
UPDATE public.restaurants SET is_approved = true WHERE is_approved = false;
