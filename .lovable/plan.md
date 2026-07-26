## Goal
Match the target layout (image-177): auto-fetched **Visit Our Website** and **Leave us a 5-Star Review** render as half-width **image tiles** in the grid alongside TikTok/Instagram, and can be freely reordered without glitches.

## Root cause
The last change reverted these two links to `display_style: 'pill'` with no `cover_image_url`, so `DashboardUnifiedContent` rendered them as plain full-width rows (image-176). The grid grouper only tiles links where `cover_image_url && grid_size === 'half'`.

## Changes

### 1. `src/pages/rep/RepDemoCreate.tsx` — seed as half-width image tiles
When Google Places returns a photo (`hostedPhotoUrl`), seed both links as tiles:

- **Visit Our Website**
  - `display_style: 'grid'`
  - `grid_size: 'half'`
  - `cover_image_url: hostedPhotoUrl` (fallback to favicon-hosted image if no photo)
  - keep `thumbnail_url` favicon for the small platform badge
- **Leave us a 5-Star Review**
  - `display_style: 'grid'`
  - `grid_size: 'half'`
  - `cover_image_url: hostedPhotoUrl` (business photo, matching TikTok/Instagram style)
  - `link_type: 'google_review'` (Google "G" badge already rendered by platform config)

If no hosted photo exists, fall back to previous pill behavior so we never render a broken tile.

### 2. `supabase/functions/magic-onboarding/index.ts` — mirror the same seeding
Apply the identical half-tile seeding for the self-serve onboarding path so both entry points behave the same.

### 3. Reorder safety — no code change needed
`DashboardUnifiedContent` already:
- Groups **consecutive** half-tiles with cover images into a 2-col grid.
- Breaks the group when a full-width row is dragged between them.
- Persists `sort_order` on drag (verified in the earlier Playwright test).

So once the seeded links have `cover_image_url + grid_size='half'`, they participate in the same reorderable grid as TikTok/Instagram — dragging any tile up/down updates `sort_order` and the grid recomposes cleanly.

### 4. Backfill existing rep demos (one-off SQL)
For rows created by the previous "pill" logic (Website + Google Review with no cover image), update to `display_style='grid'`, `grid_size='half'`, and set `cover_image_url` to the profile's `profile_photo_url` so live demos immediately match the new layout.

## Out of scope
- No changes to public renderer, autosave, or drag-and-drop internals.
- No changes to manually added links (users keep full control of grid vs pill).
