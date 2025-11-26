-- Add Yelp support fields to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS yelp_review_url text;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS yelp_business_id text;