

# Fix Solo Pro Users Landing on Wrong Dashboard

## Root Cause

Solo Pro onboarding creates **both** a `restaurants` row (with `onboarding_completed: true`) **and** a `personal_profiles` row (via magic-onboarding). When the user hits `/dashboard`, the routing logic in `Dashboard.tsx` checks `hasCompletedRestaurant` first (line 76), which is `true`, so it always shows the Restaurant (Business Plus) dashboard — even for Solo Pro users.

## Fix

Two changes needed:

### 1. Dashboard routing: check `plan_type` on restaurant row (`src/pages/Dashboard.tsx`)

Update the `decide()` function to fetch `plan_type` alongside `id, onboarding_completed`. If the restaurant's `plan_type` is `'solo'`, treat it the same as a personal-only account and route to the Lite dashboard.

```typescript
// Line ~57: add plan_type to select
.select("id, onboarding_completed, plan_type")

// Line ~71-82: update logic
const hasCompletedRestaurant = restaurantResult.data?.some(
  r => r.onboarding_completed && r.plan_type !== 'solo'
);
```

This ensures Solo Pro users with a completed restaurant record still get routed to the Lite (personal) dashboard.

### 2. Success screen: route based on plan (`src/pages/Onboarding.tsx`)

The success screen "Go to Dashboard" button (line 720) always navigates to `/dashboard`. Update it to check `resolvedDashboardType` / plan and navigate to `/dashboard?type=lite&welcome=true` for Solo Pro users.

Store the resolved dashboard type in component state when `completeSetup` runs, then use it in the success screen:

```typescript
// In success screen button:
onClick={() => navigate(
  dashboardType === 'personal' || selectedPlan === 'solo'
    ? "/dashboard?type=lite&welcome=true"
    : "/dashboard"
)}
```

### 3. Init redirect: same fix (`src/pages/Onboarding.tsx`)

Line 143 (`if (restaurant?.onboarding_completed) { navigate("/dashboard"); }`) should also check plan_type. Fetch `plan_type` in the init query and route Solo Pro to `/dashboard?type=lite`.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Fetch `plan_type`, exclude `solo` from business routing |
| `src/pages/Onboarding.tsx` | Success screen + init redirect: route Solo Pro to Lite dashboard |

