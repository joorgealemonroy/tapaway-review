
## 1. Profile photo cropper — zoom won't decrease after save
**Problem:** `ImageCropper` keeps `zoom` and `crop` in local `useState` that persist across `open` toggles. Reopening the modal shows the last saved zoom and the slider min (1) is below the current value, so it feels like it only lets you zoom in.

**Fix:** In `src/components/personal/ImageCropper.tsx`, reset `crop`, `zoom`, and `croppedAreaPixels` whenever `open` flips to `true` (or when `imageSrc` changes) via a `useEffect`. This guarantees every crop session starts at zoom=1, centered.

## 2. "Add Tile" ghost button in the dashboard content grid
Two issues in `src/components/personal/DashboardUnifiedContent.tsx`:

**a. Only show when tile is alone.** Currently the ghost tile is appended to every half-width grid group. Change the render so the "+ Add Tile" only appears when the group contains exactly one half-width link (i.e. the odd/lonely tile). Groups already containing 2 tiles get no ghost — the user adds more via the normal add flow below.

**b. Invisible in light mode.** The button uses `border-white/20` and `text-white/40`, which disappear on light backgrounds. Replace with token-based classes: `border-dashed border-border text-muted-foreground hover:bg-muted/50` so it renders in both themes.

## 3. Rep money UI — move to Commissions, quiet Home
Goal: reps should see building/pipeline progress on Home and only see earnings when they visit Commissions.

**`src/pages/rep/RepHome.tsx`:**
- Remove the emerald "Available Balance" strip and the "Demo Bonuses This Month $" tally.
- Replace with build-focused stats: Demos Today (count vs 10 quota), Awaiting Approval count, Approved This Month count, Total Live Hubs.
- Keep a single small link/button "View Commissions →" that routes to `/rep/commissions`.

**`src/pages/rep/RepCommissions.tsx`:**
- Keep and emphasize the three cards (Available / Pending / Lifetime).
- Add a "Demo Bonuses This Month" subrow under Available: `N approved × $5 = $X`.
- No other structural changes.

## 4. Verify Diego's approved demos are credited
Audit-only step (no schema changes unless we find a gap):
1. Query `commissions` for `rep_id = Diego's sales_rep.id` grouped by `commission_type` and `status`.
2. Cross-check against `personal_profiles` where `created_by_rep_id = Diego's id AND is_approved = true`: every approved profile should have exactly one `demo_bonus` row with `status = 'available'` and `amount = 5`.
3. If any approved profile is missing a bonus row, backfill by calling `award-demo-commission` for each missing profile_id (idempotent per existing edge function logic).
4. Report the counts to the user (approved hubs, bonus rows, backfilled rows, resulting available balance).

## Technical notes
- Cropper reset must key on `open` becoming `true` — resetting only on `imageSrc` change misses the case where the same photo is re-cropped.
- Ghost-tile visibility rule: `groupedItem.links.length === 1 && groupedItem.links[0].grid_size === 'half'`.
- Use semantic tokens (`border-border`, `text-muted-foreground`, `bg-muted`) — never `text-white/*` or `bg-black/*` on shared dashboard chrome.
- Backfill script runs via `supabase.functions.invoke('award-demo-commission', { body: { profile_id } })` per missing hub; the function already dedupes.
