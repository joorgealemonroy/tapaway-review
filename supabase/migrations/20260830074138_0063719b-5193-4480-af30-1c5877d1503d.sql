CREATE OR REPLACE FUNCTION public.rpt_hub_analytics_summary(
  _caller_user_id uuid, _hub_id uuid, _since timestamptz, _until timestamptz
)
RETURNS TABLE(event_name text, events bigint, sessions bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.hub_analytics_summary(_caller_user_id, _hub_id, _since, _until); $$;

CREATE OR REPLACE FUNCTION public.rpt_admin_overview(
  _caller_user_id uuid, _since timestamptz, _until timestamptz
)
RETURNS TABLE(
  raw_events bigint, validated_events bigint, validated_page_views bigint,
  verified_sessions bigint, known_returning_visitors bigint, bot_events bigint,
  internal_events bigint, cta_events bigint, conversion_events bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.admin_overview(_caller_user_id, _since, _until); $$;

CREATE OR REPLACE FUNCTION public.rpt_admin_hub_table(
  _caller_user_id uuid, _since timestamptz, _until timestamptz
)
RETURNS TABLE(
  hub_id uuid, hub_kind text, raw_events bigint, validated_events bigint,
  validated_page_views bigint, verified_sessions bigint, known_returning_visitors bigint,
  bot_events bigint, internal_events bigint, cta_events bigint, conversion_events bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.admin_hub_table(_caller_user_id, _since, _until); $$;

CREATE OR REPLACE FUNCTION public.rpt_hub_sources(
  _caller_user_id uuid, _hub_id uuid, _since timestamptz, _until timestamptz
)
RETURNS TABLE(source text, channel text, events bigint, sessions bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.hub_sources(_caller_user_id, _hub_id, _since, _until); $$;

REVOKE ALL ON FUNCTION public.rpt_hub_analytics_summary(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpt_admin_overview(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpt_admin_hub_table(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpt_hub_sources(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_hub_analytics_summary(uuid, uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpt_admin_overview(uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpt_admin_hub_table(uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpt_hub_sources(uuid, uuid, timestamptz, timestamptz) TO service_role;