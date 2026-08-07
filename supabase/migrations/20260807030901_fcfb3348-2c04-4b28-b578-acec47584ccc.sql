CREATE INDEX IF NOT EXISTS idx_personal_analytics_profile_event_created
  ON public.personal_analytics (profile_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_restaurant_event_created
  ON public.analytics_events (restaurant_id, event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_account_engagement(_since timestamptz DEFAULT NULL)
RETURNS TABLE (
  hub_id uuid,
  kind text,
  taps bigint,
  link_clicks bigint,
  contact_saves bigint,
  last_active_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH hubs AS (
    SELECT p.id, 'solo'::text AS kind FROM public.personal_profiles p
    UNION ALL
    SELECT r.id, 'business'::text AS kind FROM public.restaurants r
  ),
  unified_events AS (
    SELECT a.profile_id AS hub_id, 'solo'::text AS kind, a.event_type, a.created_at
    FROM public.personal_analytics a
    WHERE (_since IS NULL OR a.created_at >= _since)
    UNION ALL
    SELECT e.restaurant_id AS hub_id, 'business'::text AS kind, e.event_type, e.created_at
    FROM public.analytics_events e
    WHERE (_since IS NULL OR e.created_at >= _since)
  )
  SELECT
    h.id AS hub_id,
    h.kind,
    COUNT(*) FILTER (
      WHERE (h.kind = 'solo' AND e.event_type = 'profile_visit')
         OR (h.kind = 'business' AND e.event_type = 'tap')
    )::bigint AS taps,
    COUNT(*) FILTER (
      WHERE (h.kind = 'solo' AND e.event_type = 'link_click')
         OR (h.kind = 'business' AND e.event_type IN (
               'link_click','google_click','yelp_click','instagram_click',
               'directions_click','directions_clicked','phone_click'))
    )::bigint AS link_clicks,
    COUNT(*) FILTER (WHERE e.event_type = 'contact_save')::bigint AS contact_saves,
    MAX(e.created_at) AS last_active_at
  FROM hubs h
  LEFT JOIN unified_events e
    ON e.hub_id = h.id AND e.kind = h.kind
  WHERE public.is_admin()
  GROUP BY h.id, h.kind;
$$;

REVOKE ALL ON FUNCTION public.admin_account_engagement(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_account_engagement(timestamptz) TO authenticated;