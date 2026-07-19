# Fix: Admin "Review" 404 on Pending Hub Approvals

## Root cause (confirmed)

`UsernameResolver.tsx` gates public visibility to:
- `subscription_status = 'active'` **OR**
- `subscription_status = 'trialing' AND is_approved = true`

Pending hubs are `trialing` + `is_approved = false`, so the resolver falls through to `NotFound`. This is the correct public behavior — we just need an admin-only preview path.

## Plan

**1. Add an admin preview mode to `UsernameResolver.tsx`**
- Detect `?admin_preview=1` in the URL.
- When present, verify the caller is an admin via `useAdminAccess` (server-verified role — no client trust).
- If admin: fetch the profile directly from `personal_profiles` (not the `_public` view) and render it regardless of `is_approved` / `subscription_status`.
- If not admin: fall back to the normal public gate (still 404s for randos who guess the param).
- Show a small "Admin preview — unapproved hub" ribbon so it's obvious the page isn't live yet.

**2. Update `AdminPendingHubApprovals.tsx` Review button**
- Change the opened URL from `/${username}` to `/${username}?admin_preview=1`.

**3. No DB / RLS changes**
- `personal_profiles` already lets admins select all rows via existing admin policy, so no new grants/policies needed.

## Result

- Admins click **Review** → hub renders in a new tab exactly as it will look when live, with an "Admin preview" ribbon.
- Public visitors hitting `/username` or `/username?admin_preview=1` on an unapproved hub still get 404 until you approve it.
- Approval flow is unchanged.
