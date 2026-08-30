# TapAway Location Intelligence — Audit + Plan

Read-only audit complete. No data was changed.

## 1. Current location-data audit

**Tables holding businesses / hubs / physical locations**

| Table | Rows | Role |
|---|---|---|
| `personal_profiles` | 139 | Primary hub table (Solo / Business Lite). Already has `google_place_id`, `formatted_address`, `place_lat`, `place_lng`, `place_city`, `place_state`, `place_zip`, `contact_address`, `business_phone`, `sales_rep_id`, `pipeline_status`, `rep_note` |
| `restaurants` | 12 | Business/venue hubs. Has `google_place_id`, `address`, `phone`, `business_phone`, `sales_rep_id`, but **no latitude/longitude columns** |
| `locations` | 0 | Existing child-location table for multi-location restaurants (`restaurant_id`, `name`, `custom_slug`, `address`, `phone`, `is_active`). Currently unused — no coordinates, no Place ID |

**Place ID / address coverage**

- `personal_profiles`: 126 with Place ID, 84 with cached coordinates (so **42 have a Place ID but no coordinates**), 5 with an address but no Place ID, 8 with neither.
- `restaurants`: 11 of 12 with a Place ID, 5 with an address; 1 record (`ccea844b…`) has no slug, no address and no Place ID.
- Multi-location today is represented by **separate `restaurants` rows sharing a name** (Las Islas: portland / woodburn / salem / fontana / marias, plus three `-legacy` slugs), not by the `locations` table. There is no `business_id` grouping key anywhere.

**Status fields today (mixed meanings)**

- `subscription_status` (`active` / `trialing`), `plan_type` (`solo_pro`, `founding_pro`, `vip`, `monthly`, `plus_monthly`, `bundle`, `venue`), `is_approved`, `trial_ends_at`, `trial_extension_days`, `expires_at` (restaurants), `stripe_customer_id`, `stripe_subscription_id`, `pipeline_status`.

**Contradictions / cleanup list**

1. **34 profiles are `trialing` + approved with `trial_ends_at` in the past** and **23 more `trialing` + unapproved and expired** — 57 records that are effectively failed/expired trials but still read as "trialing".
2. **Only 1 of 139 profiles has a `stripe_subscription_id`**, yet 17 are `active` — so `founding_pro`, `vip` and most `solo_pro` actives are manually/complimentary activated. Stripe cannot be the sole source of truth; manual exceptions must be labelled explicitly.
3. `restaurants` marked `active` with `plan_type=bundle`/`monthly` and no Stripe subscription (9 of 12) — same complimentary/manual situation.
4. `islasmarias-legacy` is `trialing` with a NULL `trial_ends_at` — undecidable trial state.
5. `ccea844b…` restaurant has no slug/address/Place ID — orphan, needs manual triage.
6. 42 profiles with a Place ID and no cached coordinates → backfill needed (a `backfill-place-coords` function already exists and can be reused).
7. 13 records (5 address-only + 8 empty) cannot be mapped until an address or Place ID is supplied.

**Recommendation:** create a normalized `public.business_locations` table rather than a view. A view cannot store the fields this system needs (coordinates cache, verification timestamps, visit eligibility, follow-up dates, directory opt-in) and `restaurants` has no lat/lng at all. `business_locations` will reference the source hub (`personal_profile_id` / `restaurant_id` / `location_id`) and **derive** status rather than duplicate billing data, with a `business_id` grouping key so Las Islas' venues collapse into one business.

## 2. Proposed schema (all additive)

- `public.businesses` — grouping entity: `id`, `name`, `primary_contact`, `notes`, timestamps.
- `public.business_locations` — one row per physical location: business/location IDs, `hub_slug`, `hub_kind`, source FKs, `google_place_id`, `display_name`, `formatted_address`, `lat`, `lng`, `city`, `state`, `postal_code`, `business_category`, `phone`, `place_verified_at`, `coords_refreshed_at`, `place_status` (ok / stale / invalid / missing), `public_directory_opt_in`, `visit_eligible`, `access_status`, `billing_category`, `status_reason`, `trial_ends_at`, `subscription_status_snapshot`, `assigned_rep_id`, `last_visited_at`, `next_follow_up_at`, `internal_notes`, timestamps.
- `public.location_status_history` — every status change with actor, old/new values, reason, source (`stripe` / `admin` / `derivation`).
- `public.location_visits` — visit outcome log: `location_id`, `rep_id`, `visited_at`, `outcome` (visited / closed / spoke_with_owner / follow_up / converted / not_interested), notes. Kept fully separate from subscription state.
- `public.routes` and `public.route_stops` — saved route plans, settings, optimized order, ETAs, excluded stops.
- `public.places_api_log` — one row per Google API call (endpoint, location, status, cost bucket) for quota and error monitoring.

Status is written **only** by a security-definer server function (`private.derive_location_status`) invoked by the sync job, Stripe webhook and admin actions. No frontend write path can set `access_status` or `billing_category`.

## 3. Status derivation rules

`billing_category` (Stripe wins when a live subscription exists):

1. Stripe subscription present → map Stripe status: `active` + monthly price → `paid_monthly`; `active` + annual price → `paid_annual`; `trialing` → `trialing`; `past_due`/`unpaid` → `past_due`; `canceled`/`incomplete_expired` → `canceled`.
2. No Stripe subscription and `subscription_status='active'` → `complimentary` (flag `manually_managed = true`, `status_reason='manual activation, no stripe subscription'`).
3. No Stripe and `subscription_status='trialing'` and `trial_ends_at > now()` → `trialing`.
4. Otherwise → `none`.

`access_status`:

- `active` — billing is `paid_*` or `complimentary`, and `is_approved = true`.
- `trial` — `billing_category='trialing'` and trial not expired.
- `expired` — trial expired (or `expires_at` passed) with no paid/complimentary activation → this is the **failed trial** case; `status_reason` records `trial_expired_no_conversion`.
- `suspended` — `past_due`, or approved flag revoked while billing was paid.
- `archived` — explicitly archived by an admin, or hub unpublished with no billing.

`trial_ends_at` NULL while `trialing` → `access_status='expired'`, `status_reason='trial_end_unknown'` and the record is surfaced in a "needs manual review" filter rather than guessed.

## 4. Google APIs and cost controls

- **Place Details (Places API New, `places/v1/places/{id}`)** via the gateway/server key — used only during backfill and controlled refresh, never on map load. Field mask limited to `location,formattedAddress,addressComponents,displayName,primaryType,nationalPhoneNumber`.
- **Geocoding** — only for the 5 address-only records, one-off.
- **Routes API (`routes/v2:computeRoutes` with `optimizeWaypointOrder`)** — one call per route optimization, server-side. Architecture leaves a seam for Route Optimization API later.
- **Maps JavaScript API** with the referrer-restricted browser key for rendering only; markers come from our own cached rows.

Controls: coordinates cached in `business_locations` and refreshed only when `coords_refreshed_at` is older than 180 days or `place_status='stale'`; nightly refresh capped at N locations per run; per-admin rate limit on manual refresh and route optimization; every call logged in `places_api_log` with status; failures never silently overwrite existing coordinates or Place IDs (a failed lookup marks `place_status='invalid'` and leaves prior values intact).

## 5. RLS and authorization

- All new tables: RLS enabled, `GRANT` to `authenticated` and `service_role` only, no `anon` grants.
- Policies: admins (`public.is_admin()`) full access; sales reps read-only on locations assigned to them plus write on their own `location_visits`; no other access.
- Map, route and refresh reads go through a new admin-only edge function (`locations-admin`) using the same pattern already proven in `analytics-report`: verify JWT with a user-scoped client, derive caller identity from `auth.getUser()`, re-check role server-side, then use an isolated service-role client.
- Server Google key stays in edge-function secrets; the browser only ever receives the referrer-restricted maps key.
- Future public directory reads a separate `public.directory_locations` security-definer function exposing only name, slug, address, coordinates, category, phone — never billing, trial, notes, rep or analytics fields — and only for rows that are active + approved + place-verified + opted in + published.

## 6. Phased implementation

1. **Schema + derivation** — additive migration, backfill `businesses` / `business_locations` from `personal_profiles`, `restaurants`, `locations`; run the derivation function; write initial `location_status_history`. Report the cleanup list above.
2. **Coordinate hydration** — extend the existing backfill function to fill the 42 missing coordinate sets and geocode the 5 address-only records; add the nightly staleness refresh job and `places_api_log`.
3. **Admin map** — `/admin/locations` with clustered map, legend, colored **and** text-labelled markers, synchronized filterable table, location card with Open Hub / Dashboard / Directions / Add to Route / Record Visit, mobile layout.
4. **Route planner** — route settings UI, server-side Routes API optimization, ordered stops with ETAs, excluded stops, Google Maps hand-off, printable itinerary, visit outcome logging.
5. **Directory readiness** — opt-in field surfaced in the hub dashboard, eligibility function and unit checks; `/discover` built but left unlaunched pending your go-ahead.
6. **Stripe reconciliation** — extend `stripe-webhook` to update `billing_category` and append status history so classifications stay live.

## 7. Records requiring manual cleanup

- 57 expired-but-`trialing` profiles → confirm which should become `expired` vs. `complimentary`.
- 16 `active` profiles + 9 `active` restaurants with no Stripe subscription → confirm complimentary vs. missing Stripe link.
- `islasmarias-legacy` — NULL trial end while trialing.
- `ccea844b…` restaurant — no slug, address or Place ID.
- 8 profiles with neither address nor Place ID → unmappable until supplied.

Sequencing note: this starts only after the analytics/consent/Meta phases are stable, as you specified.
