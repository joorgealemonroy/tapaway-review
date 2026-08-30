CREATE OR REPLACE FUNCTION private.audit_location_coverage()
RETURNS TABLE(inserted integer, state_changed integer, duplicates integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _ins integer := 0;
  _chg integer := 0;
  _dup integer := 0;
BEGIN
  -- 1. Ensure exactly one location row per source hub (idempotent upsert).
  WITH added AS (
    INSERT INTO public.business_locations (business_id, hub_kind, personal_profile_id, hub_slug, display_name, synced_at)
    SELECT gen_random_uuid(), 'personal', p.id, p.username, COALESCE(NULLIF(trim(p.full_name), ''), p.username), now()
    FROM public.personal_profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.business_locations bl WHERE bl.personal_profile_id = p.id
    )
    ON CONFLICT (personal_profile_id) WHERE personal_profile_id IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _ins FROM added;

  WITH added AS (
    INSERT INTO public.business_locations (business_id, hub_kind, restaurant_id, hub_slug, display_name, synced_at)
    SELECT gen_random_uuid(), 'restaurant', r.id, r.custom_slug, r.restaurant_name, now()
    FROM public.restaurants r
    WHERE NOT EXISTS (
      SELECT 1 FROM public.business_locations bl WHERE bl.restaurant_id = r.id
    )
    ON CONFLICT (restaurant_id) WHERE restaurant_id IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT _ins + count(*) INTO _ins FROM added;

  -- 2. Report (never auto-merge) pre-existing duplicate source references.
  SELECT COALESCE(sum(c - 1), 0) INTO _dup FROM (
    SELECT count(*) AS c FROM public.business_locations
     WHERE personal_profile_id IS NOT NULL GROUP BY personal_profile_id HAVING count(*) > 1
    UNION ALL
    SELECT count(*) AS c FROM public.business_locations
     WHERE restaurant_id IS NOT NULL GROUP BY restaurant_id HAVING count(*) > 1
    UNION ALL
    SELECT count(*) AS c FROM public.business_locations
     WHERE location_id IS NOT NULL GROUP BY location_id HAVING count(*) > 1
  ) d;

  -- 3. Derive location_state, never overriding an explicit admin classification.
  WITH upd AS (
    UPDATE public.business_locations bl
       SET location_state = x.derived,
           location_state_source = 'auto',
           location_state_set_at = now()
      FROM (
        SELECT b.id,
               CASE
                 WHEN b.access_status IN ('archived','suspended') THEN 'archived_or_inactive'
                 WHEN b.place_status = 'invalid' THEN 'invalid_place_id'
                 WHEN b.lat IS NOT NULL AND b.lng IS NOT NULL AND b.place_status = 'ok'
                   THEN 'mapped_physical_location'
                 WHEN b.match_candidates IS NOT NULL
                      AND jsonb_array_length(b.match_candidates) > 1 THEN 'ambiguous_match'
                 ELSE 'missing_information'
               END AS derived
        FROM public.business_locations b
        WHERE b.location_state_source <> 'admin'
      ) x
     WHERE bl.id = x.id AND bl.location_state IS DISTINCT FROM x.derived
    RETURNING 1
  )
  SELECT count(*) INTO _chg FROM upd;

  RETURN QUERY SELECT _ins, _chg, _dup;
END;
$$;

REVOKE ALL ON FUNCTION private.audit_location_coverage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.audit_location_coverage() TO service_role;

CREATE OR REPLACE FUNCTION public.audit_location_coverage_admin()
RETURNS TABLE(inserted integer, state_changed integer, duplicates integer)
LANGUAGE sql
SET search_path = ''
AS $$ SELECT * FROM private.audit_location_coverage(); $$;

REVOKE ALL ON FUNCTION public.audit_location_coverage_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_location_coverage_admin() TO service_role;