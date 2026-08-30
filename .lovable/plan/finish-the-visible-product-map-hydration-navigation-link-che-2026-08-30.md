# Finish the visible product: map, hydration, navigation, link checks, errors, privacy/Meta

Six workstreams, sequenced so nothing touches hub access, billing, or historical analytics.

## 1. Real interactive Google Map on /admin/locations

- Load the Google Maps JS API (`@vis.gl/react-google-maps`) with the existing browser key plus a Map ID for a clean light-gray style.
- Full-width map near the top: 560px desktop, min 55vh mobile, pan/zoom/fullscreen controls, marker clustering when zoomed out, `fitBounds` recomputed whenever filters change.
- Marker colors: dark green active paid, purple complimentary, blue trial, orange payment attention, red failed trial/expired, gray inactive/archived, slate outline billing unknown. Legend rendered beside the map.
- Filters drive markers and the business list from one shared filtered array, so they always match.
- Marker click opens an info card: business name, hub slug, address, payment/access status, trial or paid-through date, and actions Open Hub, Open Dashboard, Directions, Add to Route, Record Visit.
- If the map cannot initialise, render a diagnostic error state that names the actual cause (missing browser key, referrer restriction, missing Map ID, billing disabled, or script load failure) — never a text fallback pretending to be the map.

## 2. Place ID hydration backfill

New admin-only action in the `locations-admin` edge function (`action: "hydrate"`), batched with concurrency limits and retry-safe:

- Targets: Place ID with no coordinates, expired Google coordinates, coordinates missing on the normalized row, and restaurant source records never hydrated.
- Calls Place Details with a minimal `location` field mask; stores coordinates with `coordinate_source='google_places'`, `coordinates_obtained_at`, and a 30-day `coordinates_expires_at`.
- Outcomes: valid → coordinates + marker; moved Place ID → follow the documented moved-place update; invalid/obsolete → flag invalid and queue manual review; API/config failure → record sanitized failure reason; rate limited → queue retry without discarding the Place ID.
- Every call logged to `places_api_log`.
- A stats strip above the map shows total locations, successfully mapped, Place IDs hydrated, invalid Place IDs, missing Place IDs, failed requests, still unmappable — plus a Hydrate button with progress.

## 3. Consistent admin back navigation

Shared `AdminPageHeader` component (title, subtitle, top-left "Back to Admin" arrow link to `/admin`, slot for actions), mobile-safe and sticky. Applied to `/admin/analytics`, `/admin/locations`, location drill-downs, route planner, error log, and broken-link details. Uses an explicit link, not browser history.

## 4. Broken-link reporting correctness

- Extend `check-hub-links` to store a classification per result: `healthy`, `confirmed_broken` (404/410/invalid URL/DNS failure), `server_error` (persistent 5xx), `tls_error`, `timeout`, `redirected`, `blocked_unverifiable` (401/403, bot protection, rate limiting).
- 403/401 never counts as broken. Retry once with a browser-like UA before classifying; persistent block → blocked_unverifiable.
- Rerun checks immediately so the 18-day-old data is refreshed.
- Heading rewritten to state affected hubs, confirmed broken links, blocked/unverifiable count, total links checked, and last-checked timestamp.
- Check Links runs a fresh pass with visible progress. Details page: open original link, open hub, edit/replace link, mark false positive for review. No automatic link modification or deletion.

## 5. Investigate the three 24-hour app errors

Read `client_errors` for the last 24 hours, reproduce each affected route, fix root causes, and report per error: message, stack/source, route, timestamp, build, role/anonymous state, frequency, reproduction result, root cause, fix, verification. Counts are not cleared or reset; an error is marked resolved only after regression testing the flow. Log payloads audited so no private user data is stored.

## 6. Privacy & Consent, then Meta

Privacy first (Meta master switch stays off until it passes):

- Consent banner with Accept All, Reject Nonessential, Manage Preferences; categories essential / analytics / advertising.
- Persistent "Privacy Choices" link, Global Privacy Control honored automatically, withdrawal supported.
- Consent records stored with version and timestamp; analytics and advertising events gated at the emit layer.
- Reviewable Privacy and Cookie Policy drafts (review-only, not published silently).
- Tests proving advertising events cannot fire without advertising consent.

Then Meta:

- Configuration UI with Pixel ID, CAPI token stored as a backend secret, test mode with a test event code, Test Events verification, shared event IDs for Pixel/CAPI dedup, last successful event plus sanitized errors, and a master switch that stays off until consent passes, credentials exist, and test events succeed.
- Cards get real actions: Configure Privacy, Configure Meta, Test Connection.

## Acceptance tests

Valid Place ID appears as a pin after hydration; all filtered markers render and fitBounds covers them; filters update map and list together; marker cards and all five actions work; map usable on desktop and mobile; missing Google configuration yields a specific setup error; analytics has a working Back to Admin; link checker separates blocked from broken; the three errors are fixed and verified; Meta emits nothing without advertising consent; hubs, access, billing and historical analytics unchanged.

## Reporting on completion

Before/after mapped-location counts, causes of remaining unmappable records, the three error resolutions, link-check classification totals, files changed, and test results.

## Technical notes

- Map: `@vis.gl/react-google-maps` + `@googlemaps/markerclusterer`, key from `VITE_GOOGLE_MAPS_API_KEY`, Map ID required for advanced markers.
- Hydration, classification and link checks all run server-side in edge functions with service-role clients; admin identity verified from the JWT.
- Migrations are additive only: new columns for hydration state/classification and a consent records table; no drops, renames or truncation.
