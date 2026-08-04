ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS place_city text,
  ADD COLUMN IF NOT EXISTS place_state text,
  ADD COLUMN IF NOT EXISTS place_zip text;

UPDATE public.personal_profiles p
SET google_place_id = sub.place_id
FROM (
  SELECT DISTINCT ON (l.profile_id)
    l.profile_id,
    substring(l.url from 'placeid=([A-Za-z0-9_\-]+)') AS place_id
  FROM public.personal_links l
  WHERE l.url ILIKE '%placeid=%'
  ORDER BY l.profile_id, l.created_at ASC
) sub
WHERE sub.profile_id = p.id
  AND sub.place_id IS NOT NULL
  AND (p.google_place_id IS NULL OR p.google_place_id = '');