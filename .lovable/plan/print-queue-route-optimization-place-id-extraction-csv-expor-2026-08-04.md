# Print Queue: Route Optimization, Place ID Extraction & CSV Export

## Verified current state (important)

The request assumes `personal_profiles` stores `google_place_id`, `address`, `formatted_address`, `city`, `state`, `zip`, `business_name`, `slug`. Confirmed against the generated database types: **none of those columns exist** on `personal_profiles`. What exists today:

- `full_name`, `username`, `contact_address`, `business_phone`
- Location data reaches a demo hub only through the Google Review link row in `personal_links` (`link_type` google review, URL shaped `.../writereview?placeid=ChIJ...`), created by the rep demo flow from Google Places.

So the Place ID is recoverable today (from the review link), but a street address generally is not.

## 1. Store location on the hub (database)

Add to `personal_profiles`: `google_place_id text`, `formatted_address text`, `place_city text`, `place_state text`, `place_zip text`. Backfill `google_place_id` for existing hubs by extracting `placeid=` from their Google review link. No new tables, so no new RLS/grants — existing policies cover the columns.

Update the rep demo creator (`RepDemoCreate.tsx`) to persist `placeId` and the Google-formatted address on the profile when a business is picked, so all future hubs carry real addresses.

## 2. `src/lib/resolveLocation.ts`

Helper returning, for a hub row:
- `query`: best location string — formatted address, else `contact_address`, else `full_name + city`
- `placeId`
- `mapsUrl`: `https://www.google.com/maps/search/?api=1&query=<query>` plus `&query_place_id=<placeId>` when present
- `quality`: `"exact"` (place id or address) vs `"fallback"` (name only)

## 3. `src/lib/routeOptimizer.ts`

Builds multi-stop directions URLs from selected hubs: last stop is `destination`, the rest are pipe-joined `waypoints`, using place IDs where available. Chunks into batches of 15 stops (Google web limit) and returns an array of links plus a flag so the UI can warn when more than one leg is produced.

## 4. Bulk Route Bar (`AdminPrintQueue.tsx`)

Query gains the new location columns. The existing selection bar gets three additional actions:
- **Open Driving Route in Google Maps** — opens leg 1 in a new tab; if selection exceeds 15, toast explains it was split and offers the remaining legs.
- **Download Route CSV** — `tapaway-dropoff-route-YYYY-MM-DD.csv` with columns: Stop #, Business Name, Display Handle, Address / Location, Google Place ID, Rep Name, Trial Ends, Google Maps Link.
- **Copy Addresses** — newline-delimited addresses to clipboard for Circuit / Roadwarrior.

Selection count in the bar already works; select-all is verified against the filtered set.

## 5. Row badges

Under each row's handle/notes: emerald "Place ID attached" / "Address on file" when exact, amber "Address needed" when falling back to the business name.

## Verification

- Typecheck.
- Playwright as admin on `/admin/print-queue`: select 3–5 rows, confirm the generated Maps URL contains all waypoints, CSV downloads with every column filled, badges reflect real data, console clean.

## Notes

Names in the CSV use the existing `resolveDisplayName` helper. All UI stays in the Obsidian-dark admin palette.
