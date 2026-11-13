-- User-authorized exact rename. Run after the slug migration, in one transaction.
-- No matching hub, an ambiguous source or an occupied destination aborts safely.
BEGIN;
DO $$
DECLARE matches integer; hub_id uuid; hub_kind text; original jsonb; saved jsonb;
BEGIN
  SELECT count(*) INTO matches FROM (
    SELECT id FROM public.personal_profiles WHERE username = 'greensleevessteakhous'
    UNION ALL
    SELECT id FROM public.restaurants WHERE custom_slug = 'greensleevessteakhous'
  ) sources;
  IF matches <> 1 THEN RAISE EXCEPTION 'Expected exactly one /greensleevessteakhous hub; found %', matches; END IF;
  SELECT id, to_jsonb(p) INTO hub_id, original FROM public.personal_profiles p WHERE username = 'greensleevessteakhous' FOR UPDATE;
  IF hub_id IS DISTINCT FROM '2a19029b-7ed9-46e4-bd6f-6416b39bf9a5'::uuid THEN
    RAISE EXCEPTION 'Greensleeves source ID changed; review required';
  END IF;
  IF hub_id IS NOT NULL THEN
    hub_kind := 'personal_profiles';
    UPDATE public.personal_profiles SET username = 'greensleeves' WHERE id = hub_id RETURNING to_jsonb(personal_profiles) INTO saved;
  ELSE
    hub_kind := 'restaurants';
    SELECT id, to_jsonb(r) INTO hub_id, original FROM public.restaurants r WHERE custom_slug = 'greensleevessteakhous' FOR UPDATE;
    UPDATE public.restaurants SET custom_slug = 'greensleeves' WHERE id = hub_id RETURNING to_jsonb(restaurants) INTO saved;
  END IF;
  IF (original - ARRAY['username','custom_slug','updated_at']) IS DISTINCT FROM (saved - ARRAY['username','custom_slug','updated_at']) THEN
    RAISE EXCEPTION 'Unexpected hub field change; rolling back';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hub_slug_redirects WHERE slug = 'greensleevessteakhous'
    AND (profile_id = hub_id OR restaurant_id = hub_id)) THEN RAISE EXCEPTION 'Old-link redirect missing'; END IF;
  RAISE NOTICE 'Renamed % % to /greensleeves; old link retained', hub_kind, hub_id;
END $$;
COMMIT;
