------------------------------------------------------------------------
-- 1) Ensure columns exist
------------------------------------------------------------------------
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS google_review_url text;

------------------------------------------------------------------------
-- 2) Function: build canonical Google review URL from place_id
--    Format: https://search.google.com/local/writereview?placeid=<PLACE_ID>
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_google_review_url(place_id text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN place_id IS NULL OR length(trim(place_id)) = 0 THEN NULL
    ELSE 'https://search.google.com/local/writereview?placeid=' || trim(place_id)
  END;
$$;

------------------------------------------------------------------------
-- 3) Function: check if a google_review_url looks valid
--    We treat "valid" as: non-empty AND starts with the canonical base
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_google_review_url_valid(url text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    url IS NOT NULL
    AND length(trim(url)) > 0
    AND trim(url) LIKE 'https://search.google.com/local/writereview?placeid=%';
$$;

------------------------------------------------------------------------
-- 4) Trigger function: sync + auto-repair google_review_url
--    Rules:
--      - If google_place_id is NULL, do nothing.
--      - If google_review_url is NULL or invalid, rebuild it from place_id.
--    This runs on INSERT and when google_place_id changes.
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_google_review_url()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS sync_google_review_url ON public.restaurants;

CREATE TRIGGER sync_google_review_url
BEFORE INSERT OR UPDATE OF google_place_id, google_review_url
ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.sync_google_review_url();

------------------------------------------------------------------------
-- 5) Backfill / Repair existing rows
--    Cases:
--      - Has place_id AND missing URL  → build it
--      - Has place_id AND bad URL     → repair it
------------------------------------------------------------------------
UPDATE public.restaurants
SET google_review_url = public.build_google_review_url(google_place_id)
WHERE google_place_id IS NOT NULL
  AND length(trim(google_place_id)) > 0
  AND (
    google_review_url IS NULL
    OR NOT public.is_google_review_url_valid(google_review_url)
  );