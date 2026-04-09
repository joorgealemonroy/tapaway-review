

# Fix: Profile Switcher Not Showing in Admin View

## Problem

When viewing a profile via admin impersonation (`?admin_view_personal=...`), the admin view code path (lines 155-201) loads the single target profile and returns early. It never populates `allProfiles`, which stays as an empty array. Since the switcher only renders when `allProfiles.length > 1`, it never appears.

## Fix — `src/pages/personal/PersonalDashboard.tsx`

In the admin view branch (around line 178, after fetching the target profile), add a query to fetch **all profiles owned by the same user** as the target profile:

1. After getting `profileData`, query `personal_profiles` where `user_id = profileData.user_id` and order by `created_at`
2. Set `setAllProfiles(...)` with the results (normalized)
3. This populates the switcher so the admin can see and use "Switch Profile" in the More menu

The `onSwitchProfile` callback also needs a small tweak for admin view: instead of setting `?profile_id=`, it should update `?admin_view_personal=` to the new profile ID so the admin impersonation context is preserved.

## Files

| File | Change |
|------|--------|
| `src/pages/personal/PersonalDashboard.tsx` | Fetch sibling profiles in admin view branch; update switcher callback to use `admin_view_personal` param when in admin mode |

