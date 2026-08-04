# Fix Route Generator Multi-Leg Handling & Google Maps 10-Stop Cap

## What's happening

Google Maps' web directions URL accepts 9 intermediate waypoints plus 1 destination — 10 stops per link. The route builder chunks at 15, and the Print Queue only opens leg 1, so selecting 30 businesses yields a map with only the first handful of stops.

## 1. Route optimizer (`src/lib/routeOptimizer.ts`)

- `MAX_STOPS_PER_LEG`: 15 to 10.
- `RouteLeg` gains: `url`, `stops`, `legNumber`, `startIndex`, `endIndex`, `firstLabel`, `lastLabel` (names via the existing `resolveDisplayName` helper).

## 2. Multi-leg route dialog (`src/pages/admin/AdminPrintQueue.tsx`)

- 10 stops or fewer: unchanged — open directly in a new tab.
- More than 10: open a shadcn `Dialog` in the Obsidian-dark palette (`#0a0e1a`, `white/10` borders):
  - Header: "30 Stops Split into 3 Legs (10 Stops/Leg)".
  - One card per leg: `Leg N · Stops X-Y (Start Name -> End Name)` with "Open in Maps" and "Copy Link".
  - Clicked legs show a green `Opened` check badge.
  - "Open All Legs" header action launches every leg URL, with the note "Enable browser pop-ups if not all tabs open."

## 3. Exports

- CSV gains a `Leg #` column so the printed sheet matches the Maps legs.
- "Copy Addresses" groups output under `--- LEG 1 ---`, `--- LEG 2 ---` headers.

## Verification

Typecheck clean; select 30 rows on `/admin/print-queue`, confirm the dialog reports 3 legs (1-10, 11-20, 21-30) and each URL carries 9 waypoints plus 1 destination.
