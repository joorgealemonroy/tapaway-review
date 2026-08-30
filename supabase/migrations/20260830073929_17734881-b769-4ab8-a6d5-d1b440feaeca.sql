-- 1. Private schema (not exposed via the Data API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- 2. Hardened admin helpers: search_path = '' + fully qualified
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.email = 'tap@tapaway.co'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3. Private aggregate function; caller identity supplied by the edge function only
CREATE OR REPLACE FUNCTION private.hub_analytics_summary(
  _caller_user_id uuid,
  _hub_id uuid,
  _since timestamptz DEFAULT NULL,
  _until timestamptz DEFAULT NULL
)
RETURNS TABLE(event_name text, events bigint, sessions bigint, visitors bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    h.event_name,
    count(*)::bigint,
    count(DISTINCT h.session_id)::bigint,
    count(DISTINCT h.visitor_id)::bigint
  FROM public.analytics_hits h
  WHERE h.hub_id = _hub_id
    AND h.is_validated = true
    AND h.traffic_class = 'human'
    AND (_since IS NULL OR h.occurred_at >= _since)
    AND (_until IS NULL OR h.occurred_at < _until)
    AND _caller_user_id IS NOT NULL
    AND (
      public.has_role(_caller_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = _caller_user_id
          AND (u.email = 'tap@tapaway.co' OR u.raw_app_meta_data->>'role' = 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.personal_profiles p
        WHERE p.id = _hub_id AND p.user_id = _caller_user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = _hub_id AND r.owner_id = _caller_user_id
      )
    )
  GROUP BY h.event_name;
$$;

REVOKE ALL ON FUNCTION private.hub_analytics_summary(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.hub_analytics_summary(uuid, uuid, timestamptz, timestamptz) TO service_role;

-- 4. Old public entry points: kept for rollback, unreachable
REVOKE ALL ON FUNCTION public.hub_analytics_summary(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_analytics_ip_hashes() FROM PUBLIC, anon, authenticated;

-- 5. Retention run log (service-role only)
CREATE TABLE IF NOT EXISTS private.retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_rows_affected bigint NOT NULL DEFAULT 0,
  error_text text
);
REVOKE ALL ON TABLE private.retention_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE private.retention_runs TO service_role;

ALTER TABLE public.analytics_config
  ADD COLUMN IF NOT EXISTS last_retention_run_at timestamptz;

-- 6. Retention enforcement
CREATE OR REPLACE FUNCTION private.enforce_analytics_retention()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _run_id uuid;
  _cfg record;
  _branches jsonb := '[]'::jsonb;
  _total bigint := 0;
  _n bigint;
  _partial boolean := false;
  _err text;
BEGIN
  INSERT INTO private.retention_runs (status) VALUES ('running') RETURNING id INTO _run_id;
  SELECT * INTO _cfg FROM public.analytics_config LIMIT 1;
  IF _cfg IS NULL THEN
    UPDATE private.retention_runs
       SET status = 'failed', completed_at = now(), error_text = 'analytics_config row missing'
     WHERE id = _run_id;
    RETURN _run_id;
  END IF;

  -- Raw analytics hits
  BEGIN
    DELETE FROM public.analytics_hits
     WHERE occurred_at < now() - make_interval(days => _cfg.raw_retention_days);
    GET DIAGNOSTICS _n = ROW_COUNT;
    _total := _total + _n;
    _branches := _branches || jsonb_build_object('branch','analytics_hits','result','ok','rows',_n);
  EXCEPTION WHEN OTHERS THEN
    _partial := true;
    _branches := _branches || jsonb_build_object('branch','analytics_hits','result','error','error',SQLSTATE);
  END;

  -- IP-derived hashes + salts
  BEGIN
    UPDATE public.analytics_hits
       SET ip_hash = NULL, ip_hash_expires_at = NULL
     WHERE ip_hash IS NOT NULL
       AND (ip_hash_expires_at IS NULL OR ip_hash_expires_at < now());
    GET DIAGNOSTICS _n = ROW_COUNT;
    _total := _total + _n;
    DELETE FROM public.analytics_ip_salt
     WHERE salt_date < ((now() AT TIME ZONE 'UTC')::date - _cfg.ip_hash_retention_days);
    _branches := _branches || jsonb_build_object('branch','ip_hashes','result','ok','rows',_n);
  EXCEPTION WHEN OTHERS THEN
    _partial := true;
    _branches := _branches || jsonb_build_object('branch','ip_hashes','result','error','error',SQLSTATE);
  END;

  -- Meta delivery logs (Phase 4; skipped until the table exists)
  BEGIN
    IF to_regclass('public.meta_event_log') IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM public.meta_event_log WHERE created_at < now() - make_interval(days => %s)',
        _cfg.meta_log_retention_days
      );
      GET DIAGNOSTICS _n = ROW_COUNT;
      _total := _total + _n;
      _branches := _branches || jsonb_build_object('branch','meta_event_log','result','ok','rows',_n);
    ELSE
      _branches := _branches || jsonb_build_object('branch','meta_event_log','result','skipped_absent');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _partial := true;
    _branches := _branches || jsonb_build_object('branch','meta_event_log','result','error','error',SQLSTATE);
  END;

  -- Consent records (Phase 3; skipped until the table exists)
  BEGIN
    IF to_regclass('public.consent_records') IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM public.consent_records WHERE created_at < now() - make_interval(days => %s)',
        _cfg.consent_retention_days
      );
      GET DIAGNOSTICS _n = ROW_COUNT;
      _total := _total + _n;
      _branches := _branches || jsonb_build_object('branch','consent_records','result','ok','rows',_n);
    ELSE
      _branches := _branches || jsonb_build_object('branch','consent_records','result','skipped_absent');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _partial := true;
    _branches := _branches || jsonb_build_object('branch','consent_records','result','error','error',SQLSTATE);
  END;

  UPDATE private.retention_runs
     SET status = CASE WHEN _partial THEN 'partial_failure' ELSE 'success' END,
         completed_at = now(),
         branches = _branches,
         total_rows_affected = _total
   WHERE id = _run_id;

  IF NOT _partial THEN
    UPDATE public.analytics_config SET last_retention_run_at = now();
  END IF;

  RETURN _run_id;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_analytics_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.enforce_analytics_retention() TO service_role;