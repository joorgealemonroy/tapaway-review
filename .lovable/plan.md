
# Username Change, Collision Prevention, and Bug Fixes

## Overview

This plan addresses four issues:
1. Allow users to change their username from the dashboard
2. Prevent username/tap-prefixed collisions (jorge vs tapjorge)
3. Fix profile photo defaulting to left instead of center
4. Update outdated "username cannot be changed" warning in signup

---

## 1. Username Collision Prevention (Database)

**Problem:** "jorge" and "tapjorge" can coexist, causing confusion since free users get the "tap" prefix.

**Solution:** Replace the `is_username_available` database function to cross-check both variants:

```sql
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.personal_profiles
    WHERE username = lower(check_username)
  )
  AND NOT EXISTS (
    -- If checking "jorge", also block if "tapjorge" exists
    SELECT 1 FROM public.personal_profiles
    WHERE username = 'tap' || lower(check_username)
      AND lower(check_username) NOT LIKE 'tap%'
  )
  AND NOT EXISTS (
    -- If checking "tapjorge", also block if "jorge" exists
    SELECT 1 FROM public.personal_profiles
    WHERE lower(check_username) LIKE 'tap%'
      AND username = substring(lower(check_username) from 4)
  )
$$;
```

This enforces that if "jorge" exists, "tapjorge" is unavailable, and vice versa. Applied at the database level so it covers signup, admin edits, and the new dashboard username change.

**Also update IdentityStep.tsx** (line 82-89): For free users, check both `tap{username}` AND the bare `{username}` via two RPC calls. For paid users, check both the bare username AND `tap{username}`. Show "taken" if either is unavailable.

---

## 2. Username Change from Dashboard

**File: `src/components/personal/DashboardHeroEditor.tsx`**

Add a new "Username" field below the Display Name:
- Shows `tapaway.co/` prefix (with `tap` shown for free users)
- 500ms debounced availability check using the updated `is_username_available` RPC
- Validates: 3-30 chars, lowercase alphanumeric + underscores, not in reserved list
- On save:
  1. Update `personal_profiles.username` (with tap prefix for free users)
  2. Update all `nfc_cards` where `owner_user_id` matches and `destination_type = 'profile'` to new username
  3. Invalidate profile cache for both old and new usernames
  4. Show toast with new URL
- Shows a small warning: "Changing your username will update your profile URL and all linked cards"

New prop needed: `planType` (string)

**File: `src/pages/personal/PersonalDashboard.tsx`**

- Pass `planType={profile.plan_type}` to `DashboardHeroEditor`
- Update `onUpdate` handler to also accept `username` changes and refresh the profile state

---

## 3. Fix Profile Photo Position Default

**File: `src/pages/personal/PersonalDashboard.tsx` (line 164)**

Change:
```typescript
pfp_position: profileData.pfp_position || "left",
```
To:
```typescript
pfp_position: profileData.pfp_position || "center",
```

This aligns with the established rule that profile photos default to center.

---

## 4. Update Signup Warning Text

**File: `src/components/personal/signup/IdentityStep.tsx` (line 261)**

Change:
```
"Your username cannot be changed after signup"
```
To:
```
"You can change your username later from your dashboard"
```

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Update `is_username_available` function to prevent tap-prefix collisions |
| `src/components/personal/signup/IdentityStep.tsx` | Cross-check both username variants, update warning text |
| `src/components/personal/DashboardHeroEditor.tsx` | Add username editing field with availability check, validation, NFC card sync |
| `src/pages/personal/PersonalDashboard.tsx` | Fix pfp_position default to "center", pass planType to HeroEditor |

---

## Technical Notes

- The database function change is the most critical piece -- it prevents collisions at the source
- The IdentityStep already checks `tap{username}` for free users, but doesn't check if the bare username exists for paid users (or vice versa). The updated RPC handles this automatically
- NFC cards are synced by updating `destination_value` for all cards owned by the user with `destination_type = 'profile'`
- Profile cache is invalidated for both old and new usernames to prevent stale redirects
