# Fix draft hub edits not showing on the live/preview page

## Confirmed cause

Checked the database: `islasmarias-new` is saving correctly (logo header, white logo background, updated 08:30 UTC today). The dashboard is fine — the public page is the problem.

Two separate issues:

1. The hub is still a draft (`trialing`, not approved), so it is not publicly visible. Only you (admin) or the rep who built it can open it, and that happens through a preview path — not the public one.
2. That preview path fetches a fixed column list that is missing `logo_bg_color` and `logo_scale`. So the preview falls back to the old `header_color` (the green `#6BCB77` band in your screenshot) and the default logo size, even though the saved values are white and the size you picked.

The public function was also recently switched to run under the visitor's own permissions; the row-level rules still allow public reads of approved hubs, so approved hubs are unaffected.

## Goal

Both you and the rep must be able to open the hub's real URL before approval and see exactly what the public will see after approval — same page, same styling, no missing fields.

## Changes

1. Make the pre-approval preview render from the same complete data as the public page: add the missing logo background color, logo size and banner shape/fit fields to the column list the slug resolver uses for admin/rep preview.
2. Add the banner fit/shape fields to the public hub function too, so the approved page uses the same values the dashboard saves. Existing rows where those values are null keep their current fallback, so hubs like Reborn Wraps look unchanged.
3. Keep a single source of truth for that field list so the preview and public paths can't drift apart again.
4. Keep the amber "not yet approved / not publicly visible" ribbon on top, but ensure the page underneath is a faithful live render.
5. Make the dashboard "View" button open that same preview URL for reps (not just admins), so the rep sees the identical page you review.

## Note on "live"

Until the hub is approved, `tapaway.co/islasmarias-new` stays hidden from the general public. After these fixes, the preview you and the rep see is pixel-for-pixel what goes public on approval.

## Verification

- Open the draft hub preview and confirm the logo band is white (not green) and the logo size matches the Design tab.
- Approve the hub and confirm the public URL renders identically in a fresh browser session.
- Confirm Reborn Wraps and other existing banner hubs render byte-identical before and after.
