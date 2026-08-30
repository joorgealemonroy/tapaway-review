# Location coverage, honest link reporting, and the 146 error occurrences

Three workstreams. Privacy/Meta stays paused. No change to hub access, subscriptions, billing, hub content, historical analytics, existing Place IDs or verified coordinates.

## What the data says right now

- `business_locations`: 151 rows, 137 with coordinates, 137 with Place IDs, 0 invalid, 14 with no Place ID. Source tables: 139 personal profiles + 12 restaurants.
- `hub_link_checks`: last run **12 Aug** — 100 ok, 76 broken, 1 malformed. Many of the 76 are 401/403 refusals from Yelp/Booksy-type hosts, which the current schema cannot express.
- `client_errors`, last 24h: **not 146 separate bugs.** One React #185 occurrence at 11:56, one legacy `cardFrontArt is not defined` on `/`, and ~130 occurrences of a single new crash at 12:15:35 on `/admin/locations`:
  `TypeError: Cannot read properties of undefined (reading 'keys')` thrown inside Google's `marker.js` during `AdvancedMarkerElement` construction — one throw per marker. **The root cause is not yet established** and will be isolated by the bisection below before any fix is written. Raster rendering is explicitly *not* assumed to be the cause: Google supports Advanced Markers on raster maps too.

## Workstream 1 — every hub gets an explicit location state

### Schema (additive migration)
Add to `business_locations`:
- `location_state text not null default 'missing_information'` with a CHECK over: `mapped_physical_location`, `multi_location_master`, `service_area_business`, `online_or_personal_hub`, `missing_information`, `ambiguous_match`, `invalid_place_id`, `archived_or_inactive`
- `location_state_source text` (`auto` / `admin`), `location_state_set_by uuid`, `location_state_set_at timestamptz`, `location_state_reason text`
- `parent_location_id uuid references business_locations(id)` for master → child links
- `match_candidates jsonb` for the ambiguous-review queue (name/address/place_id/confidence only) plus `match_candidates_expires_at timestamptz` — Google-derived candidate names and addresses expire or refresh within 30 days and are purged by the existing retention job. Place IDs persist. Admin-verified fields live in the TapAway-owned columns and are never overwritten by an automated pass.

Every state change writes a `location_status_history` row (actor, timestamp, previous value, reason). Manual states are never overwritten by automated passes.

### Coverage audit + resolver (edge function `locations-admin`, new actions)
`audit_coverage` re-scans **all** source hubs (both tables) and inserts any missing `business_locations` row — one row per source hub, no name-based grouping.

It is strictly idempotent: the migration adds (or verifies) a unique index on `(source_type, source_id)`, and the audit writes via `INSERT ... ON CONFLICT (source_type, source_id) DO UPDATE` touching only automated fields. Running the audit any number of times can never create a duplicate location row, and never overwrites admin-set state, coordinates or notes. If any pre-existing duplicates are found, they are reported for review rather than auto-merged.

`resolve` walks unresolved rows in batches, in this order:
1. Valid unexpired coordinates → `mapped_physical_location`.
2. Place ID present → Place Details hydration (existing path, minimal field mask).
3. No Place ID → server-side Places Text Search using name + any address/city/phone/website/slug evidence.
   - Auto-accept only on strong confidence: exact-ish name match **and** a matching address, phone or website domain.
   - Multiple or weak candidates → `ambiguous_match` with candidates stored for review. Never a city-center pin, never an invented coordinate.
   - Google says the place is gone/invalid → `invalid_place_id`.
   - Archived/suspended access → `archived_or_inactive`.
   - Nothing usable → `missing_information`.

Google-derived coordinates keep the 30-day expiry; Place IDs persist. API log rows stay free of keys and payloads.

### Admin UI on `/admin/locations`
- Header stat row: total hubs plus a count for each of the eight states.
- Filter chips for mapped / missing info / ambiguous / invalid Place ID / service-area / online-personal / multi-location / archived, driving the **same** memoized filtered array the map and list already share.
- New "Unresolved locations" queue: hub name, slug, evidence, reason, and actions — search & select a Google Place, replace an invalid Place ID, enter a verified address, drop a pin manually, mark service-area, mark online/personal, link master → children.
- Master hubs render their child pins instead of a synthetic center pin.
- Clustering, tone colours, info cards, directions, route queue and Record Visit keep working unchanged.

Completion requires zero physical-business hubs left unresolved; anything remaining is reported by slug with its exact blocker.

## Workstream 2 — link checking that tells the truth

Migration is non-destructive and non-reinterpreting: a **new** `classification` column carries the new vocabulary (`healthy`, `redirected`, `confirmed_broken`, `server_error`, `tls_error`, `timeout`, `blocked_unverifiable`) alongside the untouched legacy `status`, plus `final_url`, `attempts`, and a `link_check_runs` row recording each run's start/finish/completeness. Historical rows are **not** re-labelled from old data. The dashboard keeps reading the legacy card until a full fresh run completes successfully; only then does it switch to the new classifications, so a partial or failed run can never display misleading totals.

"Mark False Positive" is a **separate persistent admin override**, not a classification value: `admin_review_state` (`none` / `false_positive` / `acknowledged`), `admin_review_note`, `admin_reviewed_by`, `admin_reviewed_at`. Automated runs write only `classification` and never touch the override columns, so a later check can update what it detected while the admin's decision and note survive. The dashboard counts a link as a problem only when the automated classification says so **and** no active false-positive override exists; the details view shows both the detected classification and the override side by side, with the admin able to clear the override explicitly.

`check-hub-links` rewrite:
- HEAD → fall back to a limited GET when HEAD is unsupported/misleading.
- 401/403/429: one retry with a browser-like UA, then `blocked_unverifiable`. **Never** `confirmed_broken`.
- 404/410, invalid URL, DNS failure, redirect loop → `confirmed_broken`. Persistent 5xx → `server_error`. Cert failures → `tls_error`. Controlled retry then `timeout`.
- Redirects followed safely, final URL recorded.
- SSRF guards retained: http/https only, private/loopback/link-local blocked, every redirect destination re-validated, time and size caps. No bot-protection bypass. Customer links are never edited or deleted automatically.

Fresh full run immediately after deploy. The overview card is rewritten to show hubs with confirmed broken links, confirmed broken count, blocked/unverifiable, TLS, server errors/timeouts, total checked, and the exact last-checked timestamp — with the red/amber headline counting **only** `confirmed_broken`. The details page gains Open Link, Open Hub, Edit Link and Mark False Positive.

## Workstream 3 — diagnose the marker crash properly, then fix it

### The diagnosis is not yet made — it gets bisected first
No fix is written until an incremental reproduction in a published-equivalent build identifies the real failure. In order, each step observed with the non-minified stack:

1. Map with the production Map ID, zero markers.
2. One plain `AdvancedMarker`, no custom content.
3. One `AdvancedMarker` with the custom `Pin` content.
4. Stable marker refs, no clusterer.
5. Clusterer with one marker.
6. Clusterer with all 137 markers.

The step that first throws names the cause: Map ID missing from the production build or never passed to the map, Map ID rejected or bound to a different Google Cloud project, marker library unavailable, custom Pin/content construction, marker-ref lifecycle, clusterer integration, or a `@vis.gl/react-google-maps` ↔ Maps JS version incompatibility. If step 2 throws with capabilities reporting true, that is a package/API incompatibility and gets isolated (version pin or direct `AdvancedMarkerElement` construction) before any markers are mounted en masse.

### Capability gating — correctly
Markers wait on `map.getMapCapabilities().isAdvancedMarkersAvailable`, subscribing to `mapcapabilities_changed` until capabilities initialise. **No** `getRenderingType() === VECTOR` gate — Advanced Markers are supported on raster maps and gating on render type would hide valid pins.

If `isAdvancedMarkersAvailable` is false, the diagnostic names the actual missing capability (and whether `VITE_GOOGLE_MAPS_MAP_ID` reached the production bundle) — never "raster limitation".

### Error-flood protection
Marker construction failures are caught and coalesced: one failure mode produces one grouped error occurrence per page load, not 137 identical records.

**Acceptance:** real pins rendering on `https://tapaway.co/admin/locations`. A clean diagnostic instead of a crash is not completion.

### Grouping and reporting
`client_errors` rows are fingerprinted on normalized message (ids/hashes stripped) + route + top stack frame + build, giving unique-issue counts, first/last seen, occurrence counts, role/anonymous state and post-deploy occurrence counts. Records are **not** cleared, reset or deleted — the 146 ages out of the window naturally.

Known groups going in: the AdvancedMarker `keys` crash (~130), React #185 (1, fixed, resolved only after the published map stays clean), `cardFrontArt is not defined` (1, legacy, reproduced and fixed or confirmed stale).

The App Errors card becomes: **X unresolved unique issues**, total occurrences in 24h, new occurrences since the latest deploy, last occurrence time. A payload audit confirms no tokens, emails, form contents or query-string secrets are being stored, with sanitisation added if any are found.

## Verification before I report done

Production `/admin/locations` open 5+ minutes with no React #185 and no marker crash; every verified physical hub visible as a marker; every hub carrying an explicit state; filters moving map and list together; every unresolved physical hub listed by slug and reason; fresh link check with no 401/403 counted as broken and card totals exactly matching the details classifications; error card separating occurrences from unique issues; typecheck and production build passing; hub access, billing, subscriptions, content and historical analytics untouched.

## Completion report

Total hubs audited; before/after mapped counts; count per location state; every remaining unresolved slug with reason; Places API success/ambiguous/failed totals; fresh link totals by classification; error totals by fingerprint and resolution; files and migrations changed; production URLs tested; full acceptance-test results.
