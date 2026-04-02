

# Simplify Post-Login Routing to Use `decide()` Only

## Problem

The `signIn` function in `useAuth.tsx` duplicates the dashboard routing logic: it queries `restaurants`, `personal_profiles`, and `affiliates`, then navigates to specific routes (`/dashboard?type=lite`, `/select-dashboard`, `/paywall`, `/onboarding`). This bypasses the `decide()` function in `Dashboard.tsx` which already handles this correctly.

This means any fix to `decide()` has no effect on the login flow — there are two competing routers.

## Solution

### `src/hooks/useAuth.tsx` — Simplify `signIn` routing

Replace the entire "Normal users" block (lines 89-137) with a single `navigate("/dashboard")`. The `decide()` function in `Dashboard.tsx` will handle all routing from there.

Keep only the special-case routes that `Dashboard.tsx` cannot handle:
- Super admin → `/admin`
- Test accounts → `/admin`
- Affiliate-only users (no business or personal account) → `/affiliate`

For affiliates, we still need a quick check since `/dashboard` doesn't know about affiliate-only users. But all business vs personal routing should be delegated to `decide()`.

**Before:**
```tsx
// 50+ lines of duplicated routing logic
const [restaurantResult, personalResult, affiliateResult] = await Promise.all([...]);
if (hasValidBusiness && hasPersonal) navigate("/select-dashboard");
else if (hasValidBusiness) navigate("/dashboard");
else if (hasPersonal) navigate("/dashboard?type=lite");
else if (isAffiliate) navigate("/affiliate");
else if (restaurant && !isSubscriptionAllowed(...)) navigate("/paywall");
else if (restaurant && !restaurant.onboarding_completed) navigate("/onboarding");
else navigate("/paywall");
```

**After:**
```tsx
// Only check for affiliate (Dashboard.tsx can't handle this)
const { data: affiliate } = await supabase
  .from("affiliates")
  .select("id")
  .eq("user_id", data.user?.id)
  .eq("is_active", true)
  .maybeSingle();

if (affiliate) {
  // Check if they also have a dashboard account
  const { data: personal } = await supabase
    .from("personal_profiles")
    .select("id")
    .eq("user_id", data.user?.id)
    .maybeSingle();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", data.user?.id)
    .limit(1);
  
  if (!personal && (!restaurants || restaurants.length === 0)) {
    navigate("/affiliate");
    return { error: null };
  }
}

// Let Dashboard.tsx decide() handle all routing
navigate("/dashboard");
```

### `src/pages/Dashboard.tsx` — No changes needed

The `decide()` function already handles: completed restaurant → business, personal profile → lite, incomplete restaurant → business (onboarding), nothing → lite fallback. It also handles paywall-blocked users via `DashboardBusiness` internals.

### `src/pages/Auth.tsx` — Verify `redirectTo`

Line 50 already defaults to `/dashboard`: `const redirectTo = searchParams.get("redirect") || "/dashboard"`. This is correct — no changes needed.

## Files modified
1. `src/hooks/useAuth.tsx` — Replace duplicated routing with single `navigate("/dashboard")`

