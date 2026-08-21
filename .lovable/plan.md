# Fix draft hub edits not showing on the live/preview page

## Confirmed cause

Checked the database: `islasmarias-new` is saving correctly (logo header, white logo background, updated 08:30 UTC today). The dashboard is fine — the public page is the problem.

Two separate issues:

1. The hub is still a draft (`trialing`, not approved), so it is not publicly visible. Only you (admin) or the rep who built it can open it, and that happens through a preview path — not the public one.
2. That preview path fetches a fixed column list that is missing `logo_bg_color` and `logo_scale`. So the preview falls back to the old `header_color` (the green `#6BCB77` band in your screenshot) and the default logo size, even though the saved values are white and the size you picked.

The public function was also recently switched to run under the visitor's own permissions; the row-level rules still allow public reads of approved hubs, so approved hubs are unaffected.

## Changes

1. Add the logo fields to the preview column list used by the slug resolver so admin/rep previews of unapproved hubs render exactly what is saved (logo background color and logo size).
2. Also include the banner shape fields in that same list so banner-style drafts preview correctly.
3. Add the banner fit/shape fields to the public hub function so approved hubs receive the same values the dashboard saves, keeping the existing fallback for rows where those values are null (no visual change to existing hubs like Reborn Wraps).
4. Keep a clear indication in preview that the hub is a draft and not yet publicly visible.

## Note on "live"

Until the hub is approved, `tapaway.co/islasmarias-new` will not resolve for the general public regardless of these fixes. Approving it from the admin queue is what makes it publicly live.

## Verification

- Open the draft hub preview and confirm the logo band is white (not green) and the logo size matches the Design tab.
- Approve the hub and confirm the public URL renders identically in a fresh browser session.
- Confirm Reborn Wraps and other existing banner hubs render byte-identical before and after.
