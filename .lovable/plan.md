## Fix: seed auto-fetched links as list rows, not tiles

The glitch happens because auto-fetched Website + Google Review links are seeded as `grid_size: 'half'` image tiles. When mixed with manually added list-style links, the grid grouping shifts them around unexpectedly. The screenshot the user wants (image-175) shows them as regular full-width list rows with a favicon — identical to manually added links, and freely draggable without any grid layout logic in the way.

### Changes

**1. `src/pages/rep/RepDemoCreate.tsx`**
- Seed Website and Google Review as standard list rows: remove `grid_size: 'half'` and `cover_image_url`.
- Keep `thumbnail_url` (favicon for website, Google "G" icon for review) so the row shows a small icon like manual links do.
- Result: they render exactly like manually added links and drag anywhere in the list.

**2. `supabase/functions/magic-onboarding/index.ts`**
- Revert Website + Google Review seeding to `display_style: 'pill'` (no `grid_size`, no `cover_image_url`).
- Keep the platform icon rendering by relying on `link_type` (`google_review`, `website`).

**3. `src/components/personal/DashboardUnifiedContent.tsx`**
- Revert the grouping condition to require `cover_image_url` again (`item.data.cover_image_url && item.data.grid_size === "half"`). This restores the invariant: only image-bearing half tiles group into the 2-col grid — so a stray half without an image can never trigger layout shift.
- Remove the odd-count `col-span-2` branch added in the last turn (no longer needed once seeds aren't half tiles).

### Result
- Auto-seeded links look and behave identically to manually added ones.
- No grid glitching when adding more content afterward.
- Rep can still promote them to image tiles manually by editing the link and adding a cover image + half size.