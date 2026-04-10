

# Speed Up Profile Loading — Full Profile Passthrough

## Problem
`UsernameResolver` queries `personal_profiles` for `id, subscription_status`, then `PersonalProfilePage` re-queries the full profile. Two sequential round-trips before any content renders.

## Solution
Fetch the full profile in the resolver, pass it forward, and skip the redundant query in `useProfileData`.

## Changes

### 1. `src/pages/UsernameResolver.tsx`
- Change the resolver's `.select("id, subscription_status")` to `.select('*')` to fetch the full profile record
- When rendering `<PersonalProfilePage />` for a resolved personal profile, pass the fetched profile object as a prop: `<PersonalProfilePage initialProfile={profile} />`
- Also update the CardResolver shortcut path (line 27) — it currently passes no data, so leave it as-is (it will still work via the normal fetch path)

### 2. `src/hooks/useProfileData.ts`
- Add an optional `initialProfile` parameter to the `useProfileData` hook signature: `useProfileData(username, initialProfile?)`
- Update `fetchProfileData` to accept an optional pre-fetched profile object. When provided:
  - Skip the first `personal_profiles` query entirely
  - Jump straight to the parallel fetch of links, blocks, and nfc_cards using `initialProfile.id` and `initialProfile.user_id`
- When `initialProfile` is provided, immediately populate the profile state and cache so the UI can start rendering instantly while parallel queries load

### 3. `src/pages/personal/PersonalProfilePage.tsx`
- Update the `Props` interface to include `initialProfile?: CachedProfile`
- Pass `initialProfile` through to `useProfileData(username, initialProfile)`
- No other changes needed — the rest of the component works off the same `data` object

## Performance Impact

| Step | Before | After |
|------|--------|-------|
| Resolve type | ~200ms (select id, status) | ~200ms (select *) |
| Fetch full profile | ~200ms | **Skipped** |
| Fetch links/blocks/nfc | ~150ms (parallel) | ~150ms (parallel) |
| **Total** | **~550ms** | **~350ms** |

~35% faster. The resolver query gets slightly larger but eliminates an entire round-trip.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/UsernameResolver.tsx` | Select full profile, pass as prop |
| `src/hooks/useProfileData.ts` | Accept `initialProfile`, skip redundant query |
| `src/pages/personal/PersonalProfilePage.tsx` | Accept and forward `initialProfile` prop |

