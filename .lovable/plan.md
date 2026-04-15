

# Fix Dev Testing Loop: RLS Delete, Slug Collision & Link Constraint

## Root Cause (3 bugs)

1. **RLS blocks restaurant DELETE**: The `restaurants` table has no DELETE policy for owners — only admins can delete. The Dev Reset button runs as `tap+2@tapaway.co` (not admin), so the delete silently fails, leaving orphaned rows.

2. **Duplicate slug collision**: The orphaned restaurant row keeps the slug `thompson-building-materials-fontana`. On the next test run, the SELECT returns `[]` (different `owner_id`? no — same user, but the row still exists with `onboarding_completed=false` which the query might miss), so it tries INSERT, which hits the unique constraint.

3. **`display_style: 'card'` rejected**: The magic-onboarding edge function inserts links with `display_style: 'card'`, but the DB CHECK constraint only allows `pill`, `icon`, `both`, `grid`. All tile links fail to insert.

**Brandfetch and Google Places are both working correctly** — the logs confirm successful data retrieval.

## Fixes

### 1. Database Migration: Add DELETE policy + fix CHECK constraint
- Add RLS policy: `Owners can delete their restaurants` — `USING (auth.uid() = owner_id)`
- Alter CHECK constraint on `personal_links.display_style` to include `'card'`

### 2. Fix Onboarding Slug Handling (`src/pages/Onboarding.tsx`)
In `completeSetup`, after the INSERT fails, try to find the existing restaurant by `custom_slug` and `owner_id`, then update it instead. This handles the re-run scenario gracefully.

### 3. Fix Magic Onboarding Display Style (`supabase/functions/magic-onboarding/index.ts`)
Change `display_style: 'card'` → `display_style: 'grid'` for tile-style links (the grid value is the correct one for half-width visual tiles).

### 4. Dev Reset: Add error logging
Add `.then`/error checks on the delete calls so failures are visible in toast messages.

## Files Changed

| File | Action |
|------|--------|
| Migration SQL | Add owner DELETE policy on `restaurants`; add `'card'` to display_style CHECK (or use `'grid'`) |
| `src/pages/Onboarding.tsx` | Handle duplicate slug by falling back to upsert-by-slug |
| `supabase/functions/magic-onboarding/index.ts` | Fix `display_style: 'card'` → `'grid'` |
| `src/components/admin/DeveloperResetButton.tsx` | Add error checking on delete operations |

