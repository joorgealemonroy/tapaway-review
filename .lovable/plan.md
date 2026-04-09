

# Move Profile Switcher to "More Options" Menu

## Overview

Remove the `Select` dropdown from the dashboard header and place the "Switch Profile" action inside the existing `MobileBottomNav` "More Options" sheet. The header stays clean.

## Changes

### 1. `src/components/personal/MobileBottomNav.tsx`

**New props**: Accept `allProfiles` (array of `{id, username}`) and an `onSwitchProfile(profileId: string)` callback.

**Add "Switch Profile" row** above the Dark Mode toggle (inside the border-t section, or as the last item before it):
- Icon: `ArrowLeftRight`
- **2 profiles**: Title "Switch Profile", subtitle "Switch to @otherUsername". On click, call `onSwitchProfile(otherProfile.id)` and close the sheet.
- **3+ profiles**: Title "Switch Profile", subtitle "Select an account". On click, expand an inline list of `@username` buttons (or use a nested sheet/select). Picking one calls `onSwitchProfile(id)` and closes.
- Only render this row when `allProfiles.length > 1`.

### 2. `src/pages/personal/PersonalDashboard.tsx`

**Remove** the header `Select` dropdown (lines 546-566) — the `{allProfiles.length > 1 && (<Select ...>)}` block.

**Pass new props to `MobileBottomNav`**:
```tsx
<MobileBottomNav
  activeTab={activeTab}
  onTabChange={setActiveTab}
  isAffiliate={isAffiliate}
  allProfiles={allProfiles.map(p => ({ id: p.id, username: p.username }))}
  onSwitchProfile={(profileId) => {
    setSearchParams({ profile_id: profileId });
    setLoading(true);
    loadData();
  }}
/>
```

**Desktop fallback**: For `md:` and above (where MobileBottomNav is hidden), add the same switcher logic into the desktop tab list area — a small "Switch Profile" tab or dropdown at the end of the `TabsList`. This ensures desktop users can also switch.

### No other changes

All multi-profile data fetching, `.limit(1).maybeSingle()` fix, photo upload scoping, and admin "Link to User" tool remain exactly as previously implemented.

## Files Summary

| File | Change |
|------|--------|
| `src/components/personal/MobileBottomNav.tsx` | Add `allProfiles` + `onSwitchProfile` props, render "Switch Profile" row |
| `src/pages/personal/PersonalDashboard.tsx` | Remove header Select, pass profile data to MobileBottomNav, add desktop switcher |

