-- ============================================================
-- Phase 1: additive analytics foundation. No existing object is
-- dropped, renamed, truncated or altered destructively.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  event_name text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  visitor_id text,
  hub_id uuid,
  hub_kind text,
  path text,
  entry_path text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  campaign_channel text,
  device_category text,
  os text,
  browser text,
  country text,
  region text,
  traffic_class text NOT NULL DEFAULT 'human',
  classification_reason text,
  is_validated boolean NOT NULL DEFAULT true,
  is_new_visitor boolean,
  time_on_page_ms integer,
  scroll_depth_pct integer,
  consent_analytics boolean,
  consent_advertising boolean,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  ip_hash_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_hits_event_id_key ON public.analytics_hits (event_id);
CREATE INDEX IF NOT EXISTS analytics_hits_hub_time_idx ON public.analytics_hits (hub_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_hits_class_time_idx ON public.analytics_hits (traffic_class, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_hits_session_idx ON public.analytics_hits (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_hits_name_time_idx ON public.analytics_hits (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_hits_dedupe_idx ON public.analytics_hits (session_id, event_name, path, occurred_at DESC);

GRANT SELECT ON public.analytics_hits TO authenticated;
GRANT ALL ON public.analytics_hits TO service_role;

ALTER TABLE public.analytics_hits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read analytics hits" ON public.analytics_hits;
CREATE POLICY "Admins can read analytics hits"
  ON public.analytics_hits FOR SELECT TO authenticated
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy: only service_role (the track edge
-- function) can write. Public browsers cannot insert directly.

-- ------------------------------------------------------------
-- Cutover configuration (single row)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  cutover_at timestamptz NOT NULL DEFAULT now(),
  raw_retention_days integer NOT NULL DEFAULT 400,
  ip_hash_retention_days integer NOT NULL DEFAULT 7,
  meta_log_retention_days integer NOT NULL DEFAULT 90,
  consent_retention_days integer NOT NULL DEFAULT 730,
  meta_enabled boolean NOT NULL DEFAULT false,
  meta_test_mode boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.analytics_config TO anon, authenticated;
GRANT ALL ON public.analytics_config TO service_role;
ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read analytics config" ON public.analytics_config;
CREATE POLICY "Anyone can read analytics config"
  ON public.analytics_config FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage analytics config" ON public.analytics_config;
CREATE POLICY "Admins manage analytics config"
  ON public.analytics_config FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_analytics_config_updated_at ON public.analytics_config;
CREATE TRIGGER update_analytics_config_updated_at
  BEFORE UPDATE ON public.analytics_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.analytics_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Rotating salt for short-lived IP-derived hashes (backend only)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_ip_salt (
  salt_date date PRIMARY KEY DEFAULT (now() AT TIME ZONE 'UTC')::date,
  salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.analytics_ip_salt TO service_role;
ALTER TABLE public.analytics_ip_salt ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: unreachable from anon/authenticated,
-- including admins and the admin UI.

-- ------------------------------------------------------------
-- Validated view (security_invoker: respects analytics_hits RLS).
-- Excludes every IP-derived value.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.analytics_hits_validated
WITH (security_invoker = true) AS
  SELECT
    h.id, h.event_id, h.event_name, h.occurred_at, h.session_id, h.visitor_id,
    h.hub_id, h.hub_kind, h.path, h.entry_path, h.referrer, h.referrer_host,
    h.utm_source, h.utm_medium, h.utm_campaign, h.utm_content, h.utm_term,
    h.campaign_channel, h.device_category, h.os, h.browser, h.country, h.region,
    h.traffic_class, h.is_new_visitor, h.time_on_page_ms, h.scroll_depth_pct,
    h.props, h.created_at
  FROM public.analytics_hits h
  WHERE h.is_validated = true
    AND h.traffic_class = 'human';

GRANT SELECT ON public.analytics_hits_validated TO authenticated;

-- ------------------------------------------------------------
-- Hub-owner aggregate access: counts only, never visitor rows,
-- and only for hubs the caller owns (admins may query any hub).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hub_analytics_summary(
  _hub_id uuid,
  _since timestamptz DEFAULT NULL,
  _until timestamptz DEFAULT NULL
)
RETURNS TABLE(
  event_name text,
  events bigint,
  sessions bigint,
  visitors bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    h.event_name,
    count(*)::bigint AS events,
    count(DISTINCT h.session_id)::bigint AS sessions,
    count(DISTINCT h.visitor_id)::bigint AS visitors
  FROM public.analytics_hits h
  WHERE h.hub_id = _hub_id
    AND h.is_validated = true
    AND h.traffic_class = 'human'
    AND (_since IS NULL OR h.occurred_at >= _since)
    AND (_until IS NULL OR h.occurred_at < _until)
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.personal_profiles p
        WHERE p.id = _hub_id AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = _hub_id AND r.owner_id = auth.uid()
      )
    )
  GROUP BY h.event_name;
$$;

REVOKE ALL ON FUNCTION public.hub_analytics_summary(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hub_analytics_summary(uuid, timestamptz, timestamptz) TO authenticated;

-- ------------------------------------------------------------
-- Retention: expire IP-derived hashes (7 days by default).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_analytics_ip_hashes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cleared AS (
    UPDATE public.analytics_hits
       SET ip_hash = NULL, ip_hash_expires_at = NULL
     WHERE ip_hash IS NOT NULL
       AND (ip_hash_expires_at IS NULL OR ip_hash_expires_at < now())
    RETURNING 1
  )
  DELETE FROM public.analytics_ip_salt
   WHERE salt_date < ((now() AT TIME ZONE 'UTC')::date - 14);
$$;

REVOKE ALL ON FUNCTION public.expire_analytics_ip_hashes() FROM PUBLIC;
