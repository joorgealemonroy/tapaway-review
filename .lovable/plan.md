

# Why Content Is Missing From the Public Hub

## What's Happening

The database for the `socials` profile currently has:
- **Links**: Only Instagram and Support (2 links)
- **Blocks**: 5 blocks — but with **duplicates** (2 email_capture, 2 button blocks from the old `deferSave={false}` bug)

The TikTok link, X/Twitter link, and any other items you see in the dashboard are **only in local React state** — they were added before the save-reliability fix was applied, so they were never actually written to the database. The dashboard shows them because it keeps them in memory, but the public profile fetches from the DB and correctly shows only what's persisted.

## Root Issue

This is a **stale local state** problem, not a rendering bug. The previous silent-failure bug (now fixed) caused items to appear saved when they weren't. The dashboard never re-fetched from the DB, so it kept showing the phantom items.

## Fix Plan

### 1. Re-sync dashboard state from DB on mount
**File**: `src/components/personal/DashboardUnifiedContent.tsx`

After the initial data loads (the `links` and `blocks` props from the parent), the component should be the source of truth from the DB. Currently when the parent fetches fresh data, it does flow into this component — but the parent may also be using stale cached data.

### 2. Force re-fetch on dashboard mount
**File**: `src/pages/personal/PersonalDashboard.tsx`

When the dashboard mounts, it should always fetch fresh links and blocks from the DB, not rely on potentially stale cached state. Add an explicit re-fetch of `personal_links` and `personal_blocks` for the profile on mount to ensure the dashboard always reflects the actual DB state.

### 3. Clean up duplicate blocks in DB
Run a one-time cleanup to remove the duplicate blocks that were double-inserted by the old `deferSave={false}` bug. This prevents users from seeing duplicate content on their public profile.

### Files to modify:
- `src/pages/personal/PersonalDashboard.tsx` — force fresh DB fetch of links/blocks on mount
- Database: delete duplicate blocks for the `socials` profile

### Technical detail
The dashboard parent component needs to call `supabase.from("personal_links").select("*").eq("profile_id", profileId)` on mount rather than relying on any cached state. This ensures that after the save-reliability fix, the dashboard always starts from the true DB state, and any items that failed to save previously won't appear as phantom entries.

