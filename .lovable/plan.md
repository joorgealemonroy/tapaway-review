# Make Design changes persist instantly and match the live hub

## Confirmed causes

- The Design tab updates the parent profile immediately for preview. Its autosave then compares pending values against those already-updated props, sees no difference, and skips the database write. This affects page color, logo background, logo size, and header style.
- The live public-profile function currently returns `logo_scale` but not `logo_bg_color`. Even when the dedicated logo color exists in the database, the live hub cannot receive it and falls back to the old `header_color` (the navy band shown here).

## Changes

1. Replace prop-difference autosave with an explicit design-save queue.
   - Every Design control sends its changed field directly to persistence while updating the preview optimistically.
   - Serialize and merge rapid picker changes so an older request cannot overwrite a newer color.
   - Keep a small Saving/Saved/Error status and show a real error if persistence fails.

2. Stop parent preview updates from resetting or falsely clearing pending design state.
   - Track the last confirmed database values separately from preview values.
   - Re-sync only when switching profiles or receiving a genuinely external profile update.

3. Update the public-profile database function to return `logo_bg_color`.
   - Recreate the existing function with the new return field while preserving its current visibility rules.
   - Restore explicit execute access for public and signed-in roles after recreation.

4. Align the live profile data contract.
   - Add `logo_bg_color` and `logo_scale` to the cached public profile shape.
   - Keep the live renderer’s fallback only for older rows where the dedicated logo color is actually null.

## Verification

- On `lasnuevasislas`, change logo background, page color, and logo size one at a time; confirm each database field changes immediately.
- Open `tapaway.co/lasnuevasislas` in a fresh browser context and confirm it matches the dashboard preview: white logo band, independently selected page color, curved seam, and selected logo size.
- Refresh or reopen the Design tab and verify every value remains selected.
- Rapidly change the color picker and confirm the final selected color—not an earlier request—wins.
- Confirm an unrelated banner hub such as Reborn Wraps renders unchanged.