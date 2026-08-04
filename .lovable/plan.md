# Fix: Driving Route Drops Stops Beyond the First Leg

## What's happening

Google Maps' web directions URL only accepts 9 intermediate waypoints plus a destination — 10 stops per link. The route builder chunks at 15 stops per leg, and the Print Queue only opens leg 1 in a new tab. With 30 selected, Google silently keeps the first 10 it can handle and the rest never appear.

## The fix

### 1. Correct the chunk size
In `src/lib/routeOptimizer.ts`, change `MAX_STOPS_PER_LEG` from 15 to 10 so each generated link is actually within Google's limit. Also carry each leg's stop range (start/end index) in `RouteLeg` so the UI can label legs meaningfully.

### 2. Open every leg, not just the first
In `src/pages/admin/AdminPrintQueue.tsx`, replace the "open leg 1, toast about leg 2" behavior with a **Route legs dialog** shown whenever the selection produces more than one leg:

- Header: "30 stops split into 3 legs — Google Maps allows 10 stops per link."
- One row per leg: "Leg 1 · Stops 1-10 · <first business> to <last business>" with an "Open in Maps" button and a "Copy link" button.
- An "Open all legs" button that opens each leg in its own tab (with a note that the browser may ask to allow pop-ups).
- Legs already opened get a checkmark so the driver can track progress.

When the selection fits in one leg, keep today's behavior: open it directly, no dialog.

### 3. Keep CSV and Copy Addresses whole
Both already export all selected rows; add a `Leg #` column to the CSV so the printed sheet matches the Maps legs.

## Technical notes

- `buildRoutePlan` return type gains `legs: { url, stops, startIndex, endIndex, firstLabel, lastLabel }[]`.
- Labels come from the existing `resolveDisplayName` helper.
- Dialog uses the existing shadcn `Dialog` in the Obsidian-dark admin palette (`bg-[#0a0e1a]`, `white/10` borders).

## Verification

Select 30 rows in `/admin/print-queue`, confirm the dialog reports 3 legs covering stops 1-10, 11-20, 21-30, that each generated URL contains 9 waypoints plus a destination, and that the CSV lists all 30 rows with correct leg numbers. Typecheck clean.
