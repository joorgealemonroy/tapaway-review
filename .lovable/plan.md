## Changes

### 1. Lock username once a hub is approved
Once `personal_profiles.is_approved = true`, the public slug is live (and printed on cards / shared). Editing it silently breaks every existing link, so we disable the field entirely.

**`src/components/personal/DashboardHeroEditor.tsx`**
- Add a new prop `usernameLocked?: boolean`.
- When `usernameLocked` is true:
  - Render the username `<Input>` as `disabled`, with muted styling.
  - Skip the availability-check `useEffect` and the "changing your username will update..." warning.
  - In `handleSave`, ignore any username diff (never include `username` in the update payload, never touch `nfc_cards`).
  - Show a small helper line under the field: "Username is locked once your hub is approved."

**`src/pages/personal/PersonalDashboard.tsx`**
- Pass `usernameLocked={!!profile.is_approved}` when rendering `<DashboardHeroEditor>`.

This applies to everyone (rep, owner, admin impersonation) — approved slugs are immutable from the dashboard. Admin-level slug edits stay possible from the admin tools.

### 2. Reps return to their Businesses list after saving a draft
Right now `handleSubmitForReview` navigates to `/rep/restaurants` but `handleSaveDraft` just fires a toast and leaves the rep sitting inside the editor. The rep wants a clean handoff back to their portal.

**`src/pages/personal/PersonalDashboard.tsx`**
- In `handleSaveDraft`, after the successful update + toast, if `isRepDemo` is true, call `navigate("/rep/restaurants")` (matching the existing Submit-for-review behavior).
- Non-rep flows (owner / admin) keep current behavior — no redirect.

## Out of scope
- No database or RLS changes; approved-hub protection is enforced in the dashboard UI only (admin tools remain the canonical place to change a live slug).
- No changes to how usernames are auto-generated at submission time.
