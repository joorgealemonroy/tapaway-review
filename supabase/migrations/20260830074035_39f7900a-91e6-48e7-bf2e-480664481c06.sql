-- Admin-wide overview
CREATE OR REPLACE FUNCTION private.admin_overview(
  _caller_user_id uuid,
  _since timestamptz,
  _until timestamptz
)
RETURNS TABLE(
  raw_events bigint,
  validated_events bigint,
  validated_page_views bigint,
  verified_sessions bigint,
  known_returning_visitors bigint,
  bot_events bigint,
  internal_events bigint,
  cta_events bigint,
  conversion_events bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human')::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.event_name IN ('page_view','hub_view'))::bigint,
    count(DISTINCT h.session_id) FILTER (WHERE h.is_validated AND h.traffic_class = 'human')::bigint,
    count(DISTINCT h.visitor_id) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.is_new_visitor = false)::bigint,
    count(*) FILTER (WHERE h.traffic_class = 'bot')::bigint,
    count(*) FILTER (WHERE h.traffic_class IN ('internal','preview','development'))::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.event_name IN ('cta_click','link_click','menu_view','contact_save','call_click','directions_click','review_click','social_click','website_click'))::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.event_name IN ('lead_submit','checkout_start','purchase'))::bigint
  FROM public.analytics_hits h
  WHERE (_since IS NULL OR h.occurred_at >= _since)
    AND (_until IS NULL OR h.occurred_at < _until)
    AND _caller_user_id IS NOT NULL
    AND (
      public.has_role(_caller_user_id, 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _caller_user_id
                  AND (u.email = 'tap@tapaway.co' OR u.raw_app_meta_data->>'role' = 'admin'))
    );
$$;

-- Per-hub breakdown
CREATE OR REPLACE FUNCTION private.admin_hub_table(
  _caller_user_id uuid,
  _since timestamptz,
  _until timestamptz
)
RETURNS TABLE(
  hub_id uuid,
  hub_kind text,
  raw_events bigint,
  validated_events bigint,
  validated_page_views bigint,
  verified_sessions bigint,
  known_returning_visitors bigint,
  bot_events bigint,
  internal_events bigint,
  cta_events bigint,
  conversion_events bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    h.hub_id,
    max(h.hub_kind),
    count(*)::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human')::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.event_name IN ('page_view','hub_view'))::bigint,
    count(DISTINCT h.session_id) FILTER (WHERE h.is_validated AND h.traffic_class = 'human')::bigint,
    count(DISTINCT h.visitor_id) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.is_new_visitor = false)::bigint,
    count(*) FILTER (WHERE h.traffic_class = 'bot')::bigint,
    count(*) FILTER (WHERE h.traffic_class IN ('internal','preview','development'))::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.event_name IN ('cta_click','link_click','menu_view','contact_save','call_click','directions_click','review_click','social_click','website_click'))::bigint,
    count(*) FILTER (WHERE h.is_validated AND h.traffic_class = 'human' AND h.event_name IN ('lead_submit','checkout_start','purchase'))::bigint
  FROM public.analytics_hits h
  WHERE h.hub_id IS NOT NULL
    AND (_since IS NULL OR h.occurred_at >= _since)
    AND (_until IS NULL OR h.occurred_at < _until)
    AND _caller_user_id IS NOT NULL
    AND (
      public.has_role(_caller_user_id, 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _caller_user_id
                  AND (u.email = 'tap@tapaway.co' OR u.raw_app_meta_data->>'role' = 'admin'))
    )
  GROUP BY h.hub_id;
$$;

-- Single-hub traffic sources (admin or hub owner)
CREATE OR REPLACE FUNCTION private.hub_sources(
  _caller_user_id uuid,
  _hub_id uuid,
  _since timestamptz,
  _until timestamptz
)
RETURNS TABLE(source text, channel text, events bigint, sessions bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(NULLIF(h.utm_source, ''), NULLIF(h.referrer_host, ''), 'direct') AS source,
    COALESCE(NULLIF(h.campaign_channel, ''), 'unknown') AS channel,
    count(*)::bigint,
    count(DISTINCT h.session_id)::bigint
  FROM public.analytics_hits h
  WHERE h.hub_id = _hub_id
    AND h.is_validated = true
    AND h.traffic_class = 'human'
    AND (_since IS NULL OR h.occurred_at >= _since)
    AND (_until IS NULL OR h.occurred_at < _until)
    AND _caller_user_id IS NOT NULL
    AND (
      public.has_role(_caller_user_id, 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _caller_user_id
                  AND (u.email = 'tap@tapaway.co' OR u.raw_app_meta_data->>'role' = 'admin'))
      OR EXISTS (SELECT 1 FROM public.personal_profiles p WHERE p.id = _hub_id AND p.user_id = _caller_user_id)
      OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = _hub_id AND r.owner_id = _caller_user_id)
    )
  GROUP BY 1, 2
  ORDER BY 3 DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION private.admin_overview(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_hub_table(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.hub_sources(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_overview(uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_hub_table(uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.hub_sources(uuid, uuid, timestamptz, timestamptz) TO service_role;