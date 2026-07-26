## Problem

When the auto-scan (magic-onboarding) recognizes a business website, it seeds the Website and Google Review as plain **pill rows** (no cover image, `grid_size = null`). That's why:

1. **No image on the tile** — `cover_image_url` is never set on those two links.
2. **Buttons "glitch" when more content is added** — the dashboard's grid-pairing logic in `DashboardUnifiedContent.tsx` only groups *consecutive* links that have both `cover_image_url` AND `grid_size === "half"`. Because Website/Google Review are pills, they break the run of grid tiles above/below them, so adding any new item re-shuffles which items pair 2-up and rows appear to jump around.

Confirmed against `personal_links` for the current profile: the two auto-seeded rows have `cover_image_url: null`, `grid_size: null`, while Instagram/TikTok have both fields populated and render as tiles correctly.

## Fix (frontend + edge function only)

### 1. `supabase/functions/magic-onboarding/index.ts`
Seed the Website and Google Review links as **half-width image tiles**, matching the Instagram/TikTok pattern already used above:

- Google Review link (~line 493):
  - `display_style: 'grid'`
  - `grid_size: 'half'`
  - `cover_image_url:` a Google-branded cover — prefer `uploadedPhotoUrls[2] || uploadedPhotoUrls[0] || resolvedLogoUrl || null` so it always has an image.
- Website link (~line 507):
  - `display_style: 'grid'`
  - `grid_size: 'half'`
  - `cover_image_url:` `uploadedPhotoUrls[3] || uploadedPhotoUrls[0] || resolvedLogoUrl || null`, with a favicon fallback (`https://www.google.com/s2/favicons?domain=<host>&sz=256`) when no Google photo exists.

Keep labels ("Visit Our Website", "Leave us a Review") and URLs unchanged.

### 2. `src/pages/rep/RepDemoCreate.tsx`
Already seeds half tiles, but the Website favicon can be null when the URL has no hostname. Add the same fallback chain (favicon → hosted place photo → banner cover) so `cover_image_url` is never null. This guarantees the tile groups instead of collapsing to a pill row.

### 3. `src/components/personal/DashboardUnifiedContent.tsx` — grid-group stability
The grouping loop (lines 206–222) currently breaks a group the moment a single non-half item appears between tiles. That is the "glitch when adding more" the user is seeing. Two tweaks:

- Treat any link with `grid_size === "half"` as eligible for the grid group even if `cover_image_url` is missing (render a neutral tinted tile as fallback). This keeps auto-seeded half tiles grouped even before an image loads.
- When a grid group has an **odd count**, render the last tile at full width inside the same 2-col grid (`col-span-2`) instead of leaving a phantom empty cell that jumps positions on reorder.

No changes to save/reorder logic — the existing drag indices already reference `unifiedItems`, they just render inside groups, so odd-count handling removes the perceived "glitch".

## Out of scope
- No DB schema changes, no RLS changes.
- No backfill of existing pill-style Website/Review rows (user can drag-convert or re-run scan); we can add a one-time migration only if requested.

## Verification
1. Run magic-onboarding against a fresh profile → confirm Website + Review rows have `cover_image_url` and `grid_size = 'half'` in DB.
2. In dashboard, add a text block between two tiles → tiles stay in place, no reorder glitch.
3. Add a 5th half tile → last tile spans full width cleanly.
