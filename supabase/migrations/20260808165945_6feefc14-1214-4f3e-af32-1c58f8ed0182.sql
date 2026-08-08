CREATE TABLE public.hub_link_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL,
  kind text NOT NULL,
  slug text,
  label text,
  url text NOT NULL,
  status text NOT NULL,
  http_status integer,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hub_link_checks_hub_url_key UNIQUE (hub_id, url)
);

GRANT SELECT ON public.hub_link_checks TO authenticated;
GRANT ALL ON public.hub_link_checks TO service_role;

ALTER TABLE public.hub_link_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read link checks"
  ON public.hub_link_checks FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_hub_link_checks_updated_at
  BEFORE UPDATE ON public.hub_link_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hub_link_checks_status ON public.hub_link_checks (status, checked_at DESC);

CREATE OR REPLACE FUNCTION public.admin_engagement_daily(_days integer DEFAULT 30, _tz text DEFAULT 'UTC')
RETURNS TABLE(day date, taps bigint, clicks bigint, contact_saves bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT
      (((now() AT TIME ZONE COALESCE(_tz, 'UTC'))::date) - (GREATEST(COALESCE(_days, 30), 1) - 1)) AS start_day,
      ((now() AT TIME ZONE COALESCE(_tz, 'UTC'))::date) AS end_day
  ),
  axis AS (
    SELECT generate_series(b.start_day, b.end_day, interval '1 day')::date AS day
    FROM bounds b
  ),
  unified AS (
    SELECT ((a.created_at AT TIME ZONE COALESCE(_tz, 'UTC'))::date) AS day,
           CASE WHEN a.event_type = 'profile_visit' THEN 1 ELSE 0 END AS is_tap,
           CASE WHEN a.event_type = 'link_click' THEN 1 ELSE 0 END AS is_click,
           CASE WHEN a.event_type = 'contact_save' THEN 1 ELSE 0 END AS is_save
    FROM public.personal_analytics a
    WHERE a.created_at >= ((SELECT start_day FROM bounds)::timestamp AT TIME ZONE COALESCE(_tz, 'UTC'))
    UNION ALL
    SELECT ((e.created_at AT TIME ZONE COALESCE(_tz, 'UTC'))::date) AS day,
           CASE WHEN e.event_type = 'tap' THEN 1 ELSE 0 END AS is_tap,
           CASE WHEN e.event_type IN ('link_click','google_click','yelp_click','instagram_click','directions_click','directions_clicked','phone_click','menu_view') THEN 1 ELSE 0 END AS is_click,
           0 AS is_save
    FROM public.analytics_events e
    WHERE e.created_at >= ((SELECT start_day FROM bounds)::timestamp AT TIME ZONE COALESCE(_tz, 'UTC'))
  )
  SELECT
    ax.day,
    COALESCE(SUM(u.is_tap), 0)::bigint AS taps,
    COALESCE(SUM(u.is_click), 0)::bigint AS clicks,
    COALESCE(SUM(u.is_save), 0)::bigint AS contact_saves
  FROM axis ax
  LEFT JOIN unified u ON u.day = ax.day
  WHERE public.is_admin()
  GROUP BY ax.day
  ORDER BY ax.day;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_engagement_daily(integer, text) TO authenticated;