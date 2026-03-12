

# Add Toggle for "Founding Creator #X" Badge on Public Profile

## What
Let founding creators choose whether to show or hide the "Founding Creator #X" badge on their public profile. By default it's **hidden** (off). They can toggle it on from their dashboard settings.

## Database Change
Add a `show_founding_badge` boolean column to `personal_profiles`, defaulting to `false`:

```sql
ALTER TABLE public.personal_profiles 
ADD COLUMN show_founding_badge boolean NOT NULL DEFAULT false;
```

## Code Changes

### 1. `src/pages/personal/PersonalProfilePage.tsx`
Change the badge condition from:
```tsx
{profile.is_founding_user && (
```
to:
```tsx
{profile.is_founding_user && profile.show_founding_badge && (
```

### 2. `src/components/personal/DashboardDesignTab.tsx` (or `SettingsTab`)
Add a toggle in the dashboard for founding users:
- Only visible when `is_founding_user` is true
- Label: "Show Founding Creator badge on profile"
- Toggles `show_founding_badge` in the database

### 3. `src/hooks/useProfileData.ts`
Add `show_founding_badge` to the profile select query so public profiles receive the value.

### Files Modified
- **Migration**: Add `show_founding_badge` column
- `src/pages/personal/PersonalProfilePage.tsx` — conditional render
- `src/hooks/useProfileData.ts` — include in select
- Dashboard settings component — add toggle UI

