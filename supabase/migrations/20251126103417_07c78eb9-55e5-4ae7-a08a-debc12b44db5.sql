-- Fix search_path security warnings for Google review URL functions

CREATE OR REPLACE FUNCTION public.build_google_review_url(place_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN place_id IS NULL OR length(trim(place_id)) = 0 THEN NULL
    ELSE 'https://search.google.com/local/writereview?placeid=' || trim(place_id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_google_review_url_valid(url text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    url IS NOT NULL
    AND length(trim(url)) > 0
    AND trim(url) LIKE 'https://search.google.com/local/writereview?placeid=%';
$$;

CREATE OR REPLACE FUNCTION public.sync_google_review_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If no place id, nothing to do
  IF NEW.google_place_id IS NULL OR length(trim(NEW.google_place_id)) = 0 THEN
    RETURN NEW;
  END IF;

  -- If review URL is missing OR not in canonical format, repair it
  IF NEW.google_review_url IS NULL
     OR NOT public.is_google_review_url_valid(NEW.google_review_url)
  THEN
    NEW.google_review_url := public.build_google_review_url(NEW.google_place_id);
  END IF;

  RETURN NEW;
END;
$$;