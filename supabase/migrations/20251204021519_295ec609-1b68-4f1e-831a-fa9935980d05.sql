-- Backfill google_place_id from google_review_url for restaurants that have URL but no Place ID
-- This extracts the placeid parameter from URLs like "https://search.google.com/local/writereview?placeid=ChIJ..."

UPDATE restaurants
SET google_place_id = (
  CASE 
    -- If google_place_id is already set and doesn't look like a URL, keep it
    WHEN google_place_id IS NOT NULL 
      AND google_place_id NOT LIKE '%/%' 
      AND google_place_id NOT LIKE '%?%' 
    THEN google_place_id
    
    -- Extract from google_review_url if it contains placeid=
    WHEN google_review_url LIKE '%placeid=%' 
    THEN regexp_replace(
      regexp_replace(google_review_url, '.*[?&]placeid=', ''),
      '&.*$', ''
    )
    
    -- Extract from google_place_id if it's a URL with placeid=
    WHEN google_place_id LIKE '%placeid=%'
    THEN regexp_replace(
      regexp_replace(google_place_id, '.*[?&]placeid=', ''),
      '&.*$', ''
    )
    
    ELSE google_place_id
  END
)
WHERE google_review_url IS NOT NULL OR google_place_id IS NOT NULL;