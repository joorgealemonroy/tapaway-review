# Approved hubs, stale pipeline labels, chunk errors, broken-link noise

## What I verified

Signed in as admin and opened Accounts & Hubs in the running app. Both hubs you approved **are** in the table — but they are listed as **"Islasmarias New"** and the Gardena one under their slug, because those two profiles have an empty business name in the database. The table falls back to the slug, so searching "Las Islas Marias Gardena" finds nothing and the rows read like unrelated accounts.

I also confirmed both rows still carry the pipeline value `ready_for_review` in the database even though they are approved — approval only flips the approved flag and never clears the pipeline stage. Today the badge is computed from "approved" first, so it still reads Live, but the underlying data is wrong and any future report grouped by pipeline stage will miscount them.

## Fixes

### 1. Approved hubs are findable by their real name
- On approval, write the business name onto the profile when it's blank (from the hub's own header/logo title used at creation), and clear the pipeline stage to `approved`.
- Backfill the two Islas Marias hubs (and any other approved rep hub with a blank name) so they show their business name immediately.
- Make the accounts search match slug **and** name, so `islasmarias` finds "Las Islas Marias Gardena" and vice versa.
- Add a "Recently approved" quick filter/sort so a freshly approved hub isn't buried at the bottom of a taps-sorted list of 62 accounts.

### 2. App crash entries ("Importing a module script failed")
These are stale-bundle errors: the browser holds an old page reference after a new version ships. Add a one-time automatic reload when a lazily loaded page fails to import, so the user sees the page instead of an error boundary, and stop logging that specific case as a crash.

### 3. Broken-link report is mostly false alarms
The report flags 50 hubs, but most entries are `HTTP 403` from Yelp and booking sites that block automated checks — those links work fine for real visitors.
- Treat 403/429 from known bot-protected domains (Yelp, Booksy, Instagram, Facebook, LinkedIn) as "couldn't verify", shown in a separate muted group rather than counted as broken.
- Keep genuinely broken results (bad certificate like `bruh.com`, 404s, malformed legacy URLs) in the red "needs fixing" list.
- Show the check age clearly and add a "Re-check now" button, since the current data is 9 days old.

## Technical notes

- `src/components/admin/AdminPendingHubApprovals.tsx`: approve() also sets `pipeline_status: 'approved'` and fills `full_name` when empty.
- Data migration: set `pipeline_status = 'approved'` for `is_approved = true` rows still marked `ready_for_review`; populate blank `full_name` for approved rep hubs from their slug-derived title.
- `src/components/admin/AdminUnifiedAccountsTable.tsx`: search across name + slug (already does slug; add name normalisation), add recently-approved sort option.
- `src/App.tsx` / lazy route wrappers: retry-then-reload helper around `React.lazy` imports; filter that message out of client error logging.
- `supabase/functions/check-hub-links/index.ts`: add an "unverified" status for bot-blocked hosts; admin overview card renders broken vs unverified separately.
