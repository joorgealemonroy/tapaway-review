

# Multi-Profile Support — With Critical Bug Fixes

## Overview

Link `spacestudios` to the same user as `steezstylez`, build a profile switcher in the dashboard, and add a reusable admin "Link Profile" tool. Three critical safety fixes are incorporated.

## Data Fix

Reassign `spacestudios` (profile `485286bc...`) `user_id` to `afb12dce-aea9-43dc-80ff-edb984064de8` (the steezstylez owner).

## 1. Fix `.maybeSingle()` Crash in `Dashboard.tsx`

**Line 65-67** — the `personal_profiles` query uses `.maybeSingle()` without `.limit(1)`. When a user has 2+ profiles, Supabase throws an error.

**Fix**: Change to `.limit(1).maybeSingle()`. This safely checks "has at least one personal profile" without crashing.

## 2. Multi-Profile Loading in `PersonalDashboard.tsx`

### Profile Loading (lines 201-206)

Currently uses `.eq("user_id", user.id).single()` which will crash with 2 profiles.

**Fix**:
- Fetch **all** profiles: `.eq("user_id", user.id).order("created_at")`
- Store a `profiles` array in state
- Check `searchParams.get("profile_id")` to select a specific profile; default to first
- If only 1 profile, behavior is identical to today

### Profile Switcher UI

When `profiles.length > 1`, render a `Select` dropdown in the header showing `@username` for each profile. Switching sets `?profile_id=<id>` in the URL and reloads that profile's data.

### Links & Blocks — Strict Profile Filtering (Bug Fix #3)

The current code already filters by `.eq("profile_id", profileData.id)` (lines 242, 248). This is correct and will be preserved. After the multi-profile change, `profileData.id` will be the **active** profile's ID, so links/blocks remain strictly scoped. No change needed here — just verification that it stays correct.

## 3. Photo Upload Path — With Legacy Fallback (Bug Fix #2)

### Upload path change (line 372)

Current: `${user.id}/profile.jpg`
New: `${user.id}/${profile.id}/profile.jpg`

This prevents profile photos from overwriting each other across profiles.

### Backward compatibility fallback

In the photo display/rendering logic: the `profile_photo_url` is stored as a full URL in the database, not constructed at render time. So existing photos won't break — their full URL is already saved in `profile_photo_url`. The path change only affects **new uploads**. No fallback logic needed because the DB stores the complete URL, not a relative path.

However, the upload function must also update the DB with the new full URL (it already does at line 387-391), so this is safe.

## 4. Admin "Link Profile" Tool in `AdminPersonalAccounts.tsx`

Add a "Link to User" button/action in the admin accounts page:
- Modal with: target profile selector (username), target user (by email lookup using `get_auth_user_by_email` RPC)
- Confirm button that updates `personal_profiles.user_id` to the target user's ID
- Audit log entry for traceability

## Files Summary

| File | Change |
|------|--------|
| Migration SQL | Reassign `spacestudios` user_id |
| `src/pages/Dashboard.tsx` | `.limit(1).maybeSingle()` fix |
| `src/pages/personal/PersonalDashboard.tsx` | Multi-profile fetch, profile switcher, scoped photo upload path |
| `src/pages/admin/AdminPersonalAccounts.tsx` | "Link to User" admin action |

