## Root cause (verified via DB)

For `@greensleeves-steakhouse` the seeded links are:

| sort | label | display_style | grid_size | has_cover |
|---|---|---|---|---|
| 0 | Visit Our Website | pill | **half** | false |
| 1 | Leave us a 5-Star Review | pill | **half** | false |
| 2 | Instagram | pill | half | true |
| 3 | TikTok | pill | half | true |

The public renderer (`PersonalProfilePage.tsx` line 1218 and `ProfilePreviewRenderer.tsx` line 215) groups items into the 2-col grid purely on `grid_size === 'half'` — it doesn't require a cover image. So Website/Review get pulled into the top grid as empty half-tiles (image-181). The dashboard editor requires `cover_image_url` for grid mode, which is why it correctly shows them as pill rows there (image-180).

Two problems to fix: seeded rows carry a stale `grid_size='half'`, and the public renderer needs to match the dashboard's rule so this class of bug can't recur.

## Changes

### 1. `src/pages/rep/RepDemoCreate.tsx`
When seeding Website and Google Review links, explicitly set `grid_size: null` (and keep `display_style: 'pill'`, no `cover_image_url`). Also order them AFTER Instagram/TikTok so the layout matches image-180 (tiles on top, pill rows below).

### 2. `supabase/functions/magic-onboarding/index.ts`
Same fix: Website + Google Review inserts get `grid_size: null`, no cover, and are appended after the Instagram/TikTok tiles.

### 3. Public renderers — align with dashboard rule
- `src/pages/personal/PersonalProfilePage.tsx` (line ~1218): only treat an item as a grid tile when `grid_size === 'half' && cover_image_url`.
- `src/components/personal/ProfilePreviewRenderer.tsx` (line ~215): same guard.

This makes any pill row without a cover image render full-width regardless of legacy `grid_size` values.

### 4. Backfill existing rep-seeded rows
One-off SQL: for links where `link_type IN ('website','google_review','custom')` AND `label IN ('Visit Our Website','Leave us a 5-Star Review')` AND `cover_image_url IS NULL`, set `grid_size = NULL`. Also bump their sort_order so Instagram/TikTok tiles sit above them for existing rep demos (Greensleeves and any siblings).

## Out of scope
Dashboard editor rendering, drag/reorder logic, autosave, tile styling for social links.
