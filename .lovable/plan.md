

# Add "Show Username" Toggle to Dashboard

## Summary
Add a `show_username` boolean column to `personal_profiles` (default `true`) and a toggle switch in `DashboardHeroEditor` so users can choose whether `@username` appears on their public profile.

## Database Migration
```sql
ALTER TABLE public.personal_profiles 
  ADD COLUMN IF NOT EXISTS show_username boolean NOT NULL DEFAULT true;
```

## Code Changes

### 1. `DashboardHeroEditor.tsx`
- Accept `showUsername` prop (current DB value)
- Add local state `showUsernameValue` synced to prop
- Add a Switch toggle below the Username input: **"Show username on profile"**
- Include `show_username` in `hasChanges` check and in `handleSave` updates
- Pass `show_username` through `onUpdate` callback

### 2. `PersonalDashboard.tsx`
- Pass `showUsername={profile.show_username}` to `DashboardHeroEditor`
- Handle `show_username` in the `onUpdate` merge

### 3. `ProfilePreviewRenderer.tsx` (dashboard preview)
- Add `show_username` to `ProfileData` interface
- Line 796: conditionally render `@username` — if `show_username` is false, show `full_name` instead (even in banner mode)

### 4. `PersonalProfilePage.tsx` (live public profile)
- Same conditional: only render `@username` when `show_username !== false`

## Files Modified

| File | Change |
|------|--------|
| Database | Add `show_username` boolean column |
| `DashboardHeroEditor.tsx` | Add Switch toggle, wire into save/discard/hasChanges |
| `PersonalDashboard.tsx` | Pass `showUsername` prop |
| `ProfilePreviewRenderer.tsx` | Conditionally render username |
| `PersonalProfilePage.tsx` | Conditionally render username |

