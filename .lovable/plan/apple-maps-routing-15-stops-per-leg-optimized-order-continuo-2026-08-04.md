# Apple Maps Routing: 15 Stops Per Leg, Optimized Order, Continuous Day Route

## Goal

Replace the Google Maps "Open Driving Route" action in the Print Queue with Apple Maps links, 15 stops per leg, ordered by shortest driving path, and chained so leg 2 picks up exactly where leg 1 ended — 30 stops becomes 2 legs that read as one continuous day.

## Verified current state

- `src/lib/routeOptimizer.ts` builds Google `maps/dir/?...` URLs, caps at `MAX_STOPS_PER_LEG = 10`, and chunks the selection in the order the rows happen to be listed — no distance optimization.
- `src/lib/resolveLocation.ts` resolves an address string and `google_place_id`, but there are no latitude/longitude fields, so no distance math is possible today.
- `AdminPrintQueue.tsx` opens leg 1 directly when the selection fits one leg, otherwise shows the multi-leg dialog; CSV and "Copy Addresses" both group by leg.

## 1. Store coordinates (database)

Add `place_lat double precision` and `place_lng double precision` to `personal_profiles`. No new table, so existing policies and grants continue to cover them.

Backfill: an admin-only edge function that walks hubs with a `google_place_id` but no coordinates, calls Places API (New) place details through the connector gateway for `location`, and writes lat/lng. `RepDemoCreate.tsx` stores lat/lng at creation time going forward, alongside the address it already saves.

## 2. Route optimization (`src/lib/routeOptimizer.ts`)

- `MAX_STOPS_PER_LEG`: 10 to 15.
- New `optimizeStopOrder(stops)`: greedy nearest-neighbor over lat/lng starting from the westernmost stop, then a 2-opt cleanup pass to remove crossings. Stops without coordinates are appended at the end, grouped by city, and flagged so the UI can say they were not optimized.
- Chunk the optimized sequence into legs of 15. Each leg after the first starts from the previous leg's final stop as its origin (`saddr`), so the day is continuous with no backtracking.
- `buildLegUrl` emits Apple Maps: `https://maps.apple.com/?dirflg=d&saddr=<origin>&daddr=<stop1>+to:<stop2>...`, addresses URL-encoded, coordinates preferred over text when known.
- `RouteLeg` keeps `legNumber`, `startIndex`, `endIndex`, `firstLabel`, `lastLabel`, `stops`, `url`, and gains `originLabel` (where the leg starts) and `unoptimizedCount`.

## 3. Print Queue UI (`AdminPrintQueue.tsx`)

- Button label: "Open Route in Apple Maps".
- 15 or fewer stops: opens directly, as today.
- More than 15: the existing multi-leg dialog, retitled `30 Stops · 2 Legs (15 stops/leg)`, each card reading `Leg N · Stops X-Y · Start Name -> End Name`, with per-leg "Open in Maps" / "Copy Link", the opened-check badge, and "Open All Legs".
- Amber note in the dialog when any stop lacks coordinates: "N stops had no coordinates and were added at the end of the route."

## 4. Exports

CSV `Leg #` column and the `--- LEG N ---` clipboard grouping follow the new optimized order and 15-stop chunks; the CSV Maps link column becomes the Apple Maps pin URL.

## Verification

Typecheck, then select 30 rows on `/admin/print-queue`: confirm 2 legs (1-15, 16-30), that leg 2's origin equals leg 1's last stop, and that each Apple Maps URL opens with all its stops.
