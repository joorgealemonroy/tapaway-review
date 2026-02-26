

# Fix: adrianlasislas Profile Not Centered

## Problem

The database shows `pfp_position = 'left'` for `adrianlasislas` — it's the only account out of 12 that wasn't set to `center`. The previous backfill migration missed it or something overwrote it afterward.

## Root Cause

The `DashboardHeroEditor` (line 146) and `LinksStep` (line 268) both hardcode `pfp_position: "center"` on save, which is correct. However, the `PersonalDashboard` save handler (line 463) passes through whatever value is already stored:

```typescript
pfp_position: updates.pfpPosition ?? profile.pfp_position,
```

And the `AdminPersonalAccounts` page (line 870) allows admins to set any value including `left`. If an admin edited this account, or if the value was set before the backfill, it would persist.

## Fix

### 1. Database — Fix the single record

Run a migration to update `adrianlasislas` to `center` and change the column default to `'center'` with a constraint so it can only ever be `'center'`:

```sql
UPDATE personal_profiles SET pfp_position = 'center' WHERE pfp_position != 'center' OR pfp_position IS NULL;
ALTER TABLE personal_profiles ALTER COLUMN pfp_position SET DEFAULT 'center';
```

### 2. `src/pages/personal/PersonalProfilePage.tsx` — Hardcode center

Since all full-banner profiles must be centered, ignore the DB value and always treat `pfpCentered` as `true` when `header_type === 'banner'`:

```typescript
const pfpCentered = profile.header_type === "banner" || profile.pfp_position === "center";
```

This is a one-line change on line 828.

### 3. `src/components/personal/ProfilePreviewRenderer.tsx` — Same hardcode in preview

Apply the same logic on line 128:

```typescript
const pfpPosition = profile.header_type === "banner" ? "center" : (profile.pfp_position || "center");
```

## Files Modified
- Database migration — fix `adrianlasislas` record
- `src/pages/personal/PersonalProfilePage.tsx` — force center for banner profiles (line 828)
- `src/components/personal/ProfilePreviewRenderer.tsx` — force center in preview (line 128)

