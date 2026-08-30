-- ============================================================
-- TapAway Location Intelligence — Phase 1 (additive only)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ---------- businesses ----------
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses admin all" ON public.businesses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- business_locations ----------
CREATE TABLE public.business_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,

  hub_kind text NOT NULL CHECK (hub_kind IN ('personal','restaurant','child_location')),
  personal_profile_id uuid REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  hub_slug text,

  -- TapAway-owned business details (permanent source of record)
  display_name text,
  formatted_address text,
  city text,
  state text,
  postal_code text,
  business_category text,
  phone text,

  -- Google-sourced mirror (retention-bound, never promoted automatically)
  google_place_id text,
  g_display_name text,
  g_formatted_address text,
  g_phone text,
  g_category text,
  g_lat double precision,
  g_lng double precision,
  google_data_obtained_at timestamptz,
  google_data_expires_at timestamptz,

  -- coordinates + retention
  lat double precision,
  lng double precision,
  coordinate_source text CHECK (coordinate_source IN ('google_places','google_geocoding','customer_supplied','tapaway_verified')),
  coordinates_obtained_at timestamptz,
  coordinates_expires_at timestamptz,
  coordinate_confirmed_by uuid,
  coordinate_confirmed_at timestamptz,
  place_id_verified_at timestamptz,
  place_status text NOT NULL DEFAULT 'missing' CHECK (place_status IN ('ok','stale','invalid','missing')),

  -- access + payment classification
  access_status text NOT NULL DEFAULT 'active'
    CHECK (access_status IN ('active','trial','expired','suspended','archived')),
  payment_state text NOT NULL DEFAULT 'unknown_manual'
    CHECK (payment_state IN ('paying','complimentary','trialing','past_due','canceled','none','unknown_manual')),
  billing_interval text NOT NULL DEFAULT 'unknown'
    CHECK (billing_interval IN ('monthly','annual','one_time','custom','none','unknown')),
  billing_source text NOT NULL DEFAULT 'unknown'
    CHECK (billing_source IN ('stripe_subscription','stripe_payment','manual_invoice','cash','complimentary','legacy_manual','unknown')),
  classification_is_manual boolean NOT NULL DEFAULT false,
  status_reason text,
  trial_ends_at timestamptz,
  subscription_status_snapshot text,
  last_payment_at timestamptz,
  current_billing_period_end timestamptz,
  paid_through_at timestamptz,
  payment_evidence_ref text,
  payment_attention boolean NOT NULL DEFAULT false,

  -- ops
  assigned_rep_id uuid,
  last_visited_at timestamptz,
  next_follow_up_at timestamptz,
  internal_notes text,
  visit_eligible boolean NOT NULL DEFAULT true,
  public_directory_opt_in boolean NOT NULL DEFAULT false,
  needs_review boolean NOT NULL DEFAULT false,
  review_reason text,

  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT business_locations_one_source CHECK (
    (personal_profile_id IS NOT NULL)::int
  + (restaurant_id IS NOT NULL)::int
  + (location_id IS NOT NULL)::int = 1
  )
);

CREATE UNIQUE INDEX business_locations_personal_uniq ON public.business_locations (personal_profile_id) WHERE personal_profile_id IS NOT NULL;
CREATE UNIQUE INDEX business_locations_restaurant_uniq ON public.business_locations (restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE UNIQUE INDEX business_locations_child_uniq ON public.business_locations (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX business_locations_business_idx ON public.business_locations (business_id);
CREATE INDEX business_locations_access_idx ON public.business_locations (access_status, payment_state);
CREATE INDEX business_locations_coords_exp_idx ON public.business_locations (coordinates_expires_at) WHERE coordinates_expires_at IS NOT NULL;

GRANT ALL ON public.business_locations TO service_role;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_locations admin all" ON public.business_locations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_business_locations_updated_at BEFORE UPDATE ON public.business_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- status history ----------
CREATE TABLE public.location_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  field text NOT NULL,
  previous_value text,
  new_value text,
  reason text,
  source text NOT NULL CHECK (source IN ('stripe','admin_manual','derivation')),
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_status_history_loc_idx ON public.location_status_history (location_id, created_at DESC);
GRANT ALL ON public.location_status_history TO service_role;
ALTER TABLE public.location_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_status_history admin read" ON public.location_status_history
  FOR SELECT TO authenticated USING (public.is_admin());

-- ---------- visits ----------
CREATE TABLE public.location_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  rep_id uuid,
  actor_user_id uuid,
  visited_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL CHECK (outcome IN ('visited','closed','spoke_with_owner','follow_up','converted','not_interested')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_visits_loc_idx ON public.location_visits (location_id, visited_at DESC);
GRANT ALL ON public.location_visits TO service_role;
ALTER TABLE public.location_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_visits admin all" ON public.location_visits
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- routes ----------
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  name text,
  visit_date date,
  departure_time text,
  start_address text,
  end_address text,
  max_stops integer,
  dwell_minutes integer NOT NULL DEFAULT 15,
  avoid_tolls boolean NOT NULL DEFAULT false,
  avoid_highways boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Google-derived result block (expiring)
  google_total_duration_seconds integer,
  google_total_distance_meters integer,
  google_polyline text,
  google_result_obtained_at timestamptz,
  google_result_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.routes TO service_role;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes admin all" ON public.routes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  stop_order integer,
  excluded boolean NOT NULL DEFAULT false,
  excluded_reason text,
  outcome text CHECK (outcome IN ('visited','closed','spoke_with_owner','follow_up','converted','not_interested')),
  notes text,
  -- Google-derived, expiring with the parent route result
  google_eta timestamptz,
  google_leg_duration_seconds integer,
  google_leg_distance_meters integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, location_id)
);
CREATE INDEX route_stops_route_idx ON public.route_stops (route_id, stop_order);
GRANT ALL ON public.route_stops TO service_role;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route_stops admin all" ON public.route_stops
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- merge audit ----------
CREATE TABLE public.business_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  moved_locations jsonb NOT NULL,
  reason text,
  actor_user_id uuid,
  reverted_at timestamptz,
  reverted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.business_merges TO service_role;
ALTER TABLE public.business_merges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_merges admin read" ON public.business_merges
  FOR SELECT TO authenticated USING (public.is_admin());

-- ---------- google api call log ----------
CREATE TABLE public.places_api_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  location_id uuid,
  ok boolean NOT NULL,
  http_status integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX places_api_log_created_idx ON public.places_api_log (created_at DESC);
GRANT ALL ON public.places_api_log TO service_role;
ALTER TABLE public.places_api_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "places_api_log admin read" ON public.places_api_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================
-- Derivation + backfill (READ-ONLY against existing hub tables)
-- ============================================================
CREATE OR REPLACE FUNCTION private.derive_access_status(
  _is_approved boolean, _sub_status text, _trial_ends timestamptz, _expires timestamptz
) RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _sub_status = 'active' AND COALESCE(_is_approved, false) THEN 'active'
    WHEN _sub_status = 'active' THEN 'active'
    WHEN _sub_status = 'trialing' AND _trial_ends IS NOT NULL AND _trial_ends > now() THEN 'trial'
    WHEN _sub_status = 'trialing' THEN 'expired'
    WHEN _expires IS NOT NULL AND _expires < now() THEN 'expired'
    ELSE 'expired'
  END;
$$;

CREATE OR REPLACE FUNCTION private.derive_payment_state(
  _sub_status text, _stripe_sub text, _trial_ends timestamptz
) RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _stripe_sub IS NOT NULL AND _sub_status = 'active' THEN 'paying'
    WHEN _stripe_sub IS NOT NULL AND _sub_status = 'trialing' THEN 'trialing'
    WHEN _sub_status = 'active' THEN 'unknown_manual'
    WHEN _sub_status = 'trialing' AND _trial_ends IS NOT NULL AND _trial_ends > now() THEN 'trialing'
    ELSE 'none'
  END;
$$;

-- Creates/refreshes one business_locations row per source hub.
-- Never writes to personal_profiles / restaurants / locations.
-- Never overwrites a manual classification.
CREATE OR REPLACE FUNCTION private.sync_business_locations()
RETURNS TABLE(inserted integer, updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _ins integer := 0;
  _upd integer := 0;
  r record;
  _loc public.business_locations%ROWTYPE;
  _biz uuid;
  _access text;
  _pay text;
  _name text;
  _addr text;
  _slug text;
  _place text;
  _phone text;
  _trial timestamptz;
  _sub text;
  _stripe text;
  _needs boolean;
  _reason text;
BEGIN
  FOR r IN
    SELECT 'personal'::text AS kind, p.id AS src_id,
           COALESCE(NULLIF(trim(p.full_name),''), p.username) AS name,
           COALESCE(NULLIF(trim(p.formatted_address),''), NULLIF(trim(p.contact_address),'')) AS addr,
           p.username AS slug, p.google_place_id AS place,
           COALESCE(NULLIF(trim(p.business_phone),''), NULLIF(trim(p.contact_phone),'')) AS phone,
           p.place_city AS city, p.place_state AS state, p.place_zip AS zip,
           p.subscription_status AS sub, p.stripe_subscription_id AS stripe,
           p.trial_ends_at AS trial, NULL::timestamptz AS expires,
           p.is_approved AS approved, p.sales_rep_id AS rep
      FROM public.personal_profiles p
    UNION ALL
    SELECT 'restaurant', x.id,
           x.restaurant_name,
           NULLIF(trim(x.address),''),
           x.custom_slug, x.google_place_id,
           COALESCE(NULLIF(trim(x.business_phone),''), NULLIF(trim(x.phone),'')),
           NULL, NULL, NULL,
           x.subscription_status, x.stripe_subscription_id,
           x.trial_ends_at, x.expires_at,
           x.is_approved, x.sales_rep_id
      FROM public.restaurants x
    UNION ALL
    SELECT 'child_location', l.id,
           l.name, NULLIF(trim(l.address),''), l.custom_slug, NULL,
           NULLIF(trim(l.phone),''), NULL, NULL, NULL,
           CASE WHEN l.is_active THEN 'active' ELSE 'inactive' END, NULL,
           NULL, NULL, l.is_active, NULL
      FROM public.locations l
  LOOP
    SELECT * INTO _loc FROM public.business_locations bl
     WHERE (r.kind = 'personal' AND bl.personal_profile_id = r.src_id)
        OR (r.kind = 'restaurant' AND bl.restaurant_id = r.src_id)
        OR (r.kind = 'child_location' AND bl.location_id = r.src_id);

    _access := private.derive_access_status(r.approved, r.sub, r.trial, r.expires);
    _pay    := private.derive_payment_state(r.sub, r.stripe, r.trial);
    _needs  := (r.slug IS NOT NULL AND r.slug LIKE '%-legacy%')
               OR (r.place IS NULL AND r.addr IS NULL);
    _reason := CASE
                 WHEN r.slug IS NOT NULL AND r.slug LIKE '%-legacy%' THEN 'legacy or duplicate hub'
                 WHEN r.place IS NULL AND r.addr IS NULL THEN 'no address or place id'
                 ELSE NULL END;

    IF _loc.id IS NULL THEN
      INSERT INTO public.businesses (name) VALUES (COALESCE(r.name, r.slug, 'Untitled business'))
      RETURNING id INTO _biz;

      INSERT INTO public.business_locations (
        business_id, hub_kind,
        personal_profile_id, restaurant_id, location_id,
        hub_slug, display_name, formatted_address, city, state, postal_code, phone,
        google_place_id, place_status,
        access_status, payment_state, billing_interval, billing_source,
        status_reason, trial_ends_at, subscription_status_snapshot,
        assigned_rep_id, needs_review, review_reason, synced_at
      ) VALUES (
        _biz, r.kind,
        CASE WHEN r.kind = 'personal' THEN r.src_id END,
        CASE WHEN r.kind = 'restaurant' THEN r.src_id END,
        CASE WHEN r.kind = 'child_location' THEN r.src_id END,
        r.slug, r.name, r.addr, r.city, r.state, r.zip, r.phone,
        r.place, CASE WHEN r.place IS NULL THEN 'missing' ELSE 'stale' END,
        _access, _pay,
        CASE WHEN _pay = 'paying' THEN 'monthly' WHEN _pay IN ('none','trialing') THEN 'none' ELSE 'unknown' END,
        CASE WHEN r.stripe IS NOT NULL THEN 'stripe_subscription' ELSE 'unknown' END,
        CASE
          WHEN _pay = 'unknown_manual' THEN 'active without stripe evidence — needs manual classification'
          WHEN _access = 'expired' AND r.sub = 'trialing' THEN 'trial_expired_no_conversion'
          ELSE NULL END,
        r.trial, r.sub, r.rep, _needs, _reason, now()
      );
      _ins := _ins + 1;
    ELSE
      UPDATE public.business_locations bl SET
        hub_slug = r.slug,
        display_name = COALESCE(bl.display_name, r.name),
        formatted_address = COALESCE(bl.formatted_address, r.addr),
        city = COALESCE(bl.city, r.city),
        state = COALESCE(bl.state, r.state),
        postal_code = COALESCE(bl.postal_code, r.zip),
        phone = COALESCE(bl.phone, r.phone),
        google_place_id = COALESCE(bl.google_place_id, r.place),
        access_status = _access,
        payment_state = CASE WHEN bl.classification_is_manual THEN bl.payment_state ELSE _pay END,
        billing_source = CASE
          WHEN bl.classification_is_manual THEN bl.billing_source
          WHEN r.stripe IS NOT NULL THEN 'stripe_subscription' ELSE bl.billing_source END,
        status_reason = CASE
          WHEN bl.classification_is_manual THEN bl.status_reason
          WHEN _pay = 'unknown_manual' THEN 'active without stripe evidence — needs manual classification'
          WHEN _access = 'expired' AND r.sub = 'trialing' THEN 'trial_expired_no_conversion'
          ELSE bl.status_reason END,
        trial_ends_at = r.trial,
        subscription_status_snapshot = r.sub,
        assigned_rep_id = COALESCE(r.rep, bl.assigned_rep_id),
        needs_review = _needs,
        review_reason = _reason,
        synced_at = now()
      WHERE bl.id = _loc.id;
      _upd := _upd + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _ins, _upd;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_business_locations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.sync_business_locations() TO service_role;
REVOKE ALL ON FUNCTION private.derive_access_status(boolean, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.derive_payment_state(text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.derive_access_status(boolean, text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.derive_payment_state(text, text, timestamptz) TO service_role;

-- Purge expired Google-sourced coordinates / details / route results (30-day rule)
CREATE OR REPLACE FUNCTION private.enforce_google_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.business_locations
     SET lat = NULL, lng = NULL, coordinates_obtained_at = NULL,
         coordinates_expires_at = NULL, place_status = 'stale'
   WHERE coordinate_source IN ('google_places','google_geocoding')
     AND coordinates_expires_at IS NOT NULL
     AND coordinates_expires_at < now();

  UPDATE public.business_locations
     SET g_display_name = NULL, g_formatted_address = NULL, g_phone = NULL,
         g_category = NULL, g_lat = NULL, g_lng = NULL,
         google_data_obtained_at = NULL, google_data_expires_at = NULL
   WHERE google_data_expires_at IS NOT NULL
     AND google_data_expires_at < now();

  UPDATE public.route_stops s
     SET google_eta = NULL, google_leg_duration_seconds = NULL, google_leg_distance_meters = NULL
    FROM public.routes r
   WHERE s.route_id = r.id
     AND r.google_result_expires_at IS NOT NULL
     AND r.google_result_expires_at < now();

  UPDATE public.routes
     SET google_total_duration_seconds = NULL, google_total_distance_meters = NULL,
         google_polyline = NULL, google_result_obtained_at = NULL, google_result_expires_at = NULL
   WHERE google_result_expires_at IS NOT NULL
     AND google_result_expires_at < now();
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_google_retention() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.enforce_google_retention() TO service_role;