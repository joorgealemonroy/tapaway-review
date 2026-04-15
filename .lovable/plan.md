

# Fix: Analytics Access for Paid Plan Types

## Root Cause
The `hasProAccess` function in `src/components/personal/AdvancedAnalyticsTab.tsx` (line 46) has a hardcoded allowlist that is missing several paid plan types:

```typescript
// Current - missing 'monthly', 'yearly', 'business_lite', 'plus_monthly'
const hasProAccess = (plan, status) => {
  if (plan && ["pro", "premium", "vip", "founding_pro", "paid"].includes(plan)) return true;
  if (status === "trialing") return true;
  return false;
};
```

@sugarbloomcakery has `plan_type = 'monthly'` and `subscription_status = 'active'`, but `'monthly'` is not in the list so they get locked out.

## Fix (1 file, 1 line)
Update `hasProAccess` in `src/components/personal/AdvancedAnalyticsTab.tsx` to include all paid plan types AND also grant access when `subscription_status === 'active'`:

```typescript
const hasProAccess = (plan: string | null, status: string | null | undefined) => {
  if (!!plan && ["pro", "premium", "vip", "founding_pro", "paid", "monthly", "yearly", "business_lite", "plus_monthly"].includes(plan)) return true;
  if (status === "trialing" || status === "active") return true;
  return false;
};
```

Adding `status === 'active'` as a catch-all ensures any future plan type with an active subscription automatically gets access, preventing this class of bug from recurring.

