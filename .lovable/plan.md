# TapAway Location Intelligence — Audit + Corrected Plan

Read-only audit complete. No data was changed. Corrections below reflect your feedback on payment classification, Google data retention, grouping, directory security and permission scope.

## 1. Current location-data audit

**Tables holding businesses / hubs / physical locations**

| Table | Rows | Role |
|---|---|---|
| `personal_profiles` | 139 | Primary hub table (Solo / Business Lite). Has `google_place_id`, `formatted_address`, `place_lat`, `place_lng`, `place_city`, `place_state`, `place_zip`, `contact_address`, `business_phone`, `sales_rep_id`, `pipeline_status`, `rep_note` |
| `restaurants` | 12 | Business/venue hubs. Has `google_place_id`, `address`, `phone`, `business_phone`, `sales_rep_id`, but **no latitude/longitude columns** |
| `locations` | 0 | Existing child-location table for multi-location restaurants (`restaurant_id`, `name`, `custom_slug`, `address`, `phone`, `is_active`). Currently unused — no coordinates, no Place ID |

**Place ID / address coverage**

- `personal_profiles`: 126 with Place ID, 84 with cached coordinates (**42 have a Place ID but no coordinates**), 5 with an address but no Place ID, 8 with neither.
- `restaurants`: 11 of 12 with a Place ID, 5 with an address; 1 record (`ccea844b…`) has no slug, address or Place ID.
- Multi-location today is separate `restaurants` rows sharing a name (Las Islas: portland / woodburn / salem / fontana / marias, plus three `-legacy` slugs). There is no grouping key anywhere.

**Status fields today (mixed meanings)**

`subscription_status` (`active` / `trialing`), `plan_type` (`solo_pro`, `founding_pro`, `vip`, `monthly`, `plus_monthly`, `bundle`, `venue`), `is_approved`, `trial_ends_at`, `trial_extension_days`, `expires_at` (restaurants), `stripe_customer_id`, `stripe_subscription_id`, `pipeline_status`.

**Contradictions / cleanup list**

1. 34 profiles `trialing` + approved with `trial_ends_at` in the past, plus 23 `trialing` + unapproved and expired — 57 records reading as "trialing" while expired.
2. Only 1 of 139 profiles has a `stripe_subscription_id`, yet 17 are `active`. These are manually managed and their real payment state is **unknown**, not complimentary.
3. 9 of 12 `restaurants` are `active` with no Stripe subscription — same unknown-payment situation.
4. `islasmarias-legacy` is `trialing` with NULL `trial_ends_at` — undecidable trial state.
5. `ccea844b…` restaurant has no slug/address/Place ID — orphan, manual triage.
6. 42 profiles with a Place ID and no cached coordinates.
7. 13 records (5 address-only + 8 empty) cannot be mapped until an address or Place ID is supplied.
8. Four `-legacy` slugs are duplicate/superseded hubs — flagged for review, never treated as separate public locations.

**Recommendation:** a normalized `public.business_locations` table, not a view. A view cannot store coordinate caches with expiry, verification timestamps, visit eligibility, follow-up dates or directory opt-in, and `restaurants` has no lat/lng at all.

## 2. Corrected schema (all additive)

- `public.businesses` — grouping entity: `id`, `name`, `notes`, timestamps. **No automatic name-based grouping.** Backfill creates exactly one business per source hub; grouping (e.g. the confirmed Las Islas venues) happens only through an explicit admin merge action that records who merged what and when.
- `public.business_locations` — one row per physical location:
  - Identity: `id`, `business_id` (NOT NULL FK — every location belongs to exactly one business), `hub_kind` (`personal` / `restaurant` / `child_location`), `personal_profile_id` / `restaurant_id` / `location_id` (exactly one non-null, enforced by a CHECK constraint), `hub_slug`.
  - Uniqueness: partial unique indexes on each source FK so a source hub can never produce duplicate location rows.
  - Place data: `google_place_id`, `display_name`, `formatted_address`, `city`, `state`, `postal_code`, `business_category`, `phone`.
  - Coordinates with retention: `lat`, `lng`, `coordinate_source` (`google_places` / `google_geocoding` / `customer_supplied` / `tapaway_verified`), `coordinates_obtained_at`, `coordinates_expires_at`, `place_id_verified_at`, `place_status` (`ok` / `stale` / `invalid` / `missing`).
  - Access & billing (see §3): `access_status`, `payment_state`, `billing_interval`, `billing_source`, `classification_is_manual`, `status_reason`, `trial_ends_at`, `subscription_status_snapshot`.
  - Ops: `assigned_rep_id`, `last_visited_at`, `next_follow_up_at`, `internal_notes`, `visit_eligible`, `public_directory_opt_in`, `needs_review` (legacy/duplicate/ambiguous), timestamps.
- `public.location_status_history` — every change to access or payment fields: actor, timestamp, field, previous value, new value, reason, source (`stripe` / `admin_manual` / `derivation`).
- `public.location_visits` — visit outcome log (`visited`, `closed`, `spoke_with_owner`, `follow_up`, `converted`, `not_interested`), notes, rep, timestamp. Fully separate from subscription state.
- `public.routes` / `public.route_stops` — TapAway-owned data (selected businesses, visit order, settings, outcomes, notes) stored permanently; Google-derived results (ETAs, durations, distances, polylines, leg coordinates) stored in a separate nullable result block with `google_result_obtained_at` and `google_result_expires_at`. Expired Google results are purged by the retention job and recomputed when the route is reopened.
- `public.places_api_log` — per-call endpoint, target location, status, error, for quota and error monitoring.

All status fields are written only by a security-definer server function or an admin action through the protected edge function. No frontend write path can set `access_status`, `payment_state`, `billing_interval` or `billing_source`.

## 3. Corrected status-derivation rules

Access and payment are independent. **Backfill never changes hub access.** `access_status` is derived from existing approval/trial/expiry data only; an unknown payment state never suspends or downgrades a business.

`payment_state` — `paying` | `complimentary` | `trialing` | `past_due` | `canceled` | `none` | `unknown_manual`
`billing_interval` — `monthly` | `annual` | `one_time` | `custom` | `none` | `unknown`
`billing_source` — `stripe_subscription` | `stripe_payment` | `manual_invoice` | `cash` | `complimentary` | `legacy_manual` | `unknown`

Derivation order:

1. **Explicit manual classification exists** → keep it. Automated reconciliation may override it only when confirmed Stripe evidence supersedes it (a live Stripe subscription or payment found on the same customer), and that override is written to status history with source `stripe`.
2. **Stripe subscription present** → `payment_state` from Stripe status (`active`→`paying`, `trialing`→`trialing`, `past_due`/`unpaid`→`past_due`, `canceled`/`incomplete_expired`→`canceled`); `billing_interval` from the price recurrence; `billing_source='stripe_subscription'`.
3. **Stripe one-time payment / payment link found, no subscription** → `paying`, `billing_interval='one_time'`, `billing_source='stripe_payment'`.
4. **`subscription_status='active'`, no Stripe evidence** → `payment_state='unknown_manual'`, `billing_interval='unknown'`, `billing_source='unknown'`, `status_reason='active without stripe evidence — needs manual classification'`, and the row enters the manual-review queue. It is **not** labelled complimentary.
5. **`subscription_status='trialing'` and trial not expired** → `trialing`.
6. Otherwise → `none`.

`access_status` — `active` | `trial` | `expired` | `suspended` | `archived`:

- `active` — approved and currently entitled (paid, complimentary, **or unknown_manual**). Unknown payment never removes access.
- `trial` — trialing with an unexpired trial.
- `expired` — trial ended (or `expires_at` passed) with no activation → the **failed trial** case, `status_reason='trial_expired_no_conversion'`.
- `suspended` — set only by confirmed Stripe `past_due`/`unpaid`, or an explicit admin action. Never set by missing billing evidence.
- `archived` — explicitly archived by an admin.

Admin-facing labels: **Paid**, **Free/Complimentary**, **Trial**, **Failed Trial**, **Past Due**, **Inactive**, **Billing Status Unknown** (from `unknown_manual`).

Manual-review workflow: an admin queue lists the 16 profiles and 9 restaurants classified `unknown_manual`; each can be set to paid monthly, paid annual, one-time, complimentary, legacy manual or another category. Every manual classification records actor, timestamp, reason and previous value in `location_status_history` and sets `classification_is_manual = true`.

Marker colors add a **Billing Status Unknown** entry (slate/outlined) alongside dark green (active paying), purple (active complimentary), blue (trialing), orange (past due / attention), red (expired or failed trial), gray (archived / suspended / unpublished). Every marker and card also carries a text status — color is never the only signal.

## 4. Google APIs, retention and cost controls

- **Place Details (Places API New)** through the server key — used at backfill and controlled refresh only, never on map load. Field mask limited to `location,formattedAddress,addressComponents,displayName,primaryType,nationalPhoneNumber`.
- **Geocoding** — only for the 5 address-only records.
- **Routes API (`routes/v2:computeRoutes` with `optimizeWaypointOrder`)** — one server-side call per optimization; architecture leaves a seam for Route Optimization API later.
- **Maps JavaScript API** with the referrer-restricted browser key for rendering only; markers come from our own cached rows.

Retention corrections:

- Google-sourced coordinates get **`coordinates_expires_at = coordinates_obtained_at + 30 days`**. A nightly job refreshes or clears expired Google-sourced coordinates; no Google-sourced lat/lng is retained past its expiry.
- Coordinates independently supplied or confirmed by TapAway/the customer are marked `coordinate_source='customer_supplied'`/`'tapaway_verified'` and are exempt from the 30-day window.
- Place IDs may be stored long-term; they are refreshed on their own lifecycle (re-verified when a Place Details call reports the ID moved or is invalid, recording `place_id_verified_at`).
- Google route results expire on their own timestamp and are purged; reopening an expired route recomputes them. TapAway-owned route content persists.
- Google Maps attribution and the required terms/privacy notices are rendered on every map and itinerary surface.

Cost controls: refresh only on expiry or `place_status='stale'`, nightly refresh capped per run, per-admin rate limits on manual refresh and route optimization, every call logged in `places_api_log`, and a failed lookup marks `place_status='invalid'` without overwriting existing coordinates or Place IDs.

## 5. RLS, authorization and permission scope

- **First release is admin-only.** RLS enabled on all new tables; `GRANT` to `service_role` only, with no blanket `authenticated` table grants. Admin access flows exclusively through the protected edge function.
- New admin-only edge function `locations-admin`, following the proven `analytics-report` pattern: verify JWT with a user-scoped client, derive caller identity from `auth.getUser()`, re-check admin role server-side, then use an isolated service-role client for privileged reads and writes.
- Sales-representative access is deliberately **not** granted in this release; it is added when a rep-facing interface exists and has been tested.
- The server Google key stays in edge-function secrets; the browser only receives the referrer-restricted maps key. Administrator and rep locations are never persisted or exposed.
- **Future public directory:** no SECURITY DEFINER function exposed to `anon`. `/discover` will read through a protected public edge function returning an explicit allowlist of fields (name, slug, city, address, coordinates, category, public phone, hub link) for rows that are simultaneously active access, approved, published, place-verified and explicitly opted in. Billing, payment state, trial data, internal notes, rep assignment and analytics are never returned.

## 6. Phased implementation

1. **Schema + derivation** — additive migration; backfill one location row per source hub (no name-based grouping); run derivation; write initial history; flag `-legacy` and ambiguous rows as `needs_review`. No access changes.
2. **Manual-review queue** — admin UI to classify the 25 `unknown_manual` records, with full history capture.
3. **Coordinate hydration + retention jobs** — fill the 42 missing coordinate sets, geocode the 5 address-only records, add the 30-day coordinate expiry job, Place ID re-verification, route-result purge and `places_api_log`.
4. **Admin map** — `/admin/locations`: clustered map, legend, colored + text-labelled markers, synchronized filterable table, location card with Open Hub / Dashboard / Directions / Add to Route / Record Visit, mobile layout.
5. **Route planner** — settings UI, server-side optimization, ordered stops with ETAs, excluded stops, Google Maps hand-off, printable itinerary, visit outcome logging.
6. **Business grouping** — admin merge tool to combine confirmed multi-location businesses (Las Islas) under one `business_id`.
7. **Directory readiness** — opt-in control in the hub dashboard, eligibility checks, protected public function; `/discover` built but unlaunched.
8. **Stripe reconciliation** — extend `stripe-webhook` to update payment fields and append status history, respecting manual classifications.

## 7. Records requiring manual cleanup

- 57 expired-but-`trialing` profiles → confirm expired vs. activated.
- 16 `active` profiles + 9 `active` restaurants → classify from `unknown_manual`.
- `islasmarias-legacy` — NULL trial end while trialing.
- `ccea844b…` restaurant — no slug, address or Place ID.
- 8 profiles with neither address nor Place ID — unmappable until supplied.
- 4 `-legacy` hubs — confirm as duplicates/superseded.

Sequencing: implementation starts only after the analytics, consent and Meta phases are stable.
