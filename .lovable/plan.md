

# Ensure Founding Pro Users Have Full Access

## Problems Found

Three places where `founding_pro` is missing from pro/paid access checks:

1. **AdvancedAnalyticsTab.tsx** — `hasProAccess()` checks for `"pro", "premium", "vip"` but NOT `"founding_pro"`. Founding users see the locked/blurred analytics view.

2. **PersonalShopTab.tsx** — `isFreeUser` check is `!planType || planType === 'free'`, which correctly allows founding_pro through. **No fix needed here.**

3. **PersonalSignup.tsx** — `isPaid` check on line 222 doesn't include `"founding_pro"`, so founding users get forced to "color" headers instead of banner/image during signup.

## Changes

### File: `src/components/personal/AdvancedAnalyticsTab.tsx`
Add `"founding_pro"` to the `hasProAccess` check:
```typescript
const hasProAccess = (plan: string | null, status: string | null | undefined) => {
  if (!!plan && ["pro", "premium", "vip", "founding_pro"].includes(plan)) return true;
  if (status === "trialing") return true;
  return false;
};
```

### File: `src/pages/personal/PersonalSignup.tsx`
Add `"founding_pro"` to the `isPaid` check:
```typescript
const isPaid = onboardingData.planType === "monthly" || onboardingData.planType === "yearly" || onboardingData.planType === "vip" || onboardingData.planType === "founding_pro";
```

Two lines across two files.

