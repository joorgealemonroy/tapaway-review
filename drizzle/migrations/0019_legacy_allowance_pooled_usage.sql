CREATE OR REPLACE FUNCTION public.legacy_allowance_status(_key text, _since timestamptz)
RETURNS TABLE(allowance integer, used integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH recs AS (
    SELECT plan_type FROM public.personal_profiles WHERE legacy_allowance AND legacy_allowance_key = _key
    UNION ALL
    SELECT plan_type FROM public.restaurants WHERE legacy_allowance AND legacy_allowance_key = _key
  )
  SELECT
    COALESCE(MAX(CASE WHEN plan_type IN ('venue','venue_pack','venue_yearly','bundle','yearly_200','multi') THEN 15 ELSE 4 END), 0)::int,
    (COALESCE((SELECT SUM(r.quantity) FROM public.personal_card_requests r
        JOIN public.personal_profiles p ON p.id = r.profile_id
        WHERE p.legacy_allowance AND p.legacy_allowance_key = _key AND r.is_addon AND r.created_at >= _since), 0)
   + COALESCE((SELECT SUM(o.quantity) FROM public.fulfillment_orders o
        JOIN public.restaurants x ON x.id = o.restaurant_id
        WHERE x.legacy_allowance AND x.legacy_allowance_key = _key AND o.plan = 'addon' AND o.created_at >= _since), 0))::int
  FROM recs;
$$;
REVOKE ALL ON FUNCTION public.legacy_allowance_status(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.legacy_allowance_status(text, timestamptz) TO service_role;