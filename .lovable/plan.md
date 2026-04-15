

# Fix Magic Onboarding Routing & Edge Function Bugs

## Root Cause Analysis

The logs confirm the exact failure chain:

1. **Edge function crash**: `magic-onboarding` tries to insert `display_name` into `personal_profiles`, but the column is actually called `full_name`. This causes `PGRST204` and the profile is never created.
2. **Silent failure**: The error is caught as "non-blocking" (line 532), so onboarding continues to Stripe checkout without a personal profile.
3. **Wrong redirect**: After Stripe, the success screen navigates to `/dashboard`. The `DashboardSelector` finds no `personal_profiles` record (because it was never created), finds only a `restaurants` record, and routes to the restaurant view.
4. **`dashboardType` not restored**: On OAuth return, `dashboardType` state is never restored from localStorage even though it was saved. The init effect restores `businessName`, `shippingAddress`, `planType`, `hasProtection` — but not `dashboardType`.

## Fixes

### 1. Fix Edge Function Column Name
**File**: `supabase/functions/magic-onboarding/index.ts`

Replace all references to `display_name` with `full_name` (the actual column in `personal_profiles`).

### 2. Restore `dashboardType` from localStorage
**File**: `src/pages/Onboarding.tsx` (init effect, ~line 128-131)

Add: `if (savedData.dashboardType) setDashboardType(savedData.dashboardType);`

### 3. Fix Post-Stripe Redirect for Personal Users
**File**: `src/pages/Onboarding.tsx` (Stripe return handler, ~line 145-184)

After checkout verification, check if user has a `personal_profiles` record. If so, redirect to `/dashboard?type=lite&welcome=true` instead of showing the generic success screen. Also check saved `dashboardType` from localStorage.

### 4. Add Logging to Edge Function
**File**: `supabase/functions/magic-onboarding/index.ts`

The function already has good logging (confirmed in logs). The issue is purely the wrong column name. After fixing, the existing logs will confirm successful execution.

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/magic-onboarding/index.ts` | Fix `display_name` → `full_name` |
| `src/pages/Onboarding.tsx` | Restore `dashboardType` from localStorage; fix post-Stripe redirect for personal users |

