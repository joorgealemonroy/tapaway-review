
# Plan: Add TapAway VIP Plan Option for Admin Account Creation

## Overview

Add a "TapAway VIP" plan type that administrators can select when creating personal accounts. This plan grants full Pro features for free, forever, without requiring any payment or Stripe subscription.

---

## Current Behavior

When admins create accounts, they can select:
- **Free** (tap prefix, limited features)
- **Pro Monthly** ($10/mo, full features)
- **Pro Yearly** ($75/yr, full features)

Currently, the only way to get a "VIP" account is to select Monthly/Yearly without Stripe - which is detected in the billing tab but isn't an explicit option.

---

## Solution

### 1. Add "vip" as a Plan Type

Update the plan type union across the codebase to include `"vip"`:

```typescript
planType: "free" | "monthly" | "yearly" | "vip"
```

### 2. Update Plan Limits Configuration

Add VIP to `src/lib/personalPlanLimits.ts`:

```typescript
export const PERSONAL_PLANS = {
  free: { /* existing */ },
  paid: { /* existing */ },
  vip: {
    name: 'VIP',
    maxLinks: -1, // unlimited
    price: '$0',
    priceSubtext: 'forever',
    features: {
      nfcCard: true,
      customHeader: true,
      photoCollage: true,
      emailCapture: true,
      advancedAnalytics: true,
      socialIconBar: true,
      youtube: true,
      image: true,
      text: true,
      button: true,
    },
  },
} as const;
```

### 3. Update Helper Functions

Update `getPlanLimits()` to recognize VIP:

```typescript
export function getPlanLimits(planType: string | null) {
  if (planType === 'free') return PERSONAL_PLANS.free;
  if (planType === 'vip') return PERSONAL_PLANS.vip;
  return PERSONAL_PLANS.paid;
}

export function isVIPPlan(planType: string | null): boolean {
  return planType === 'vip';
}

export function isPaidPlan(planType: string | null): boolean {
  return planType !== 'free' && planType !== 'vip' && planType !== null;
}
```

### 4. Add VIP Option in Admin UI

Update `AdminPersonalAccounts.tsx` plan selector:

```tsx
<SelectContent>
  <SelectItem value="free">Free (tap prefix)</SelectItem>
  <SelectItem value="vip">
    <span className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-emerald-500" />
      TapAway VIP (Free forever)
    </span>
  </SelectItem>
  <SelectItem value="monthly">Pro Monthly (${PERSONAL_PRICING.monthly}/mo)</SelectItem>
  <SelectItem value="yearly">Pro Yearly (${PERSONAL_PRICING.yearly}/yr)</SelectItem>
</SelectContent>
```

### 5. Update Billing Tab Display

Update `PersonalBillingTab.tsx` to properly detect VIP accounts:

```typescript
// Detect VIP by plan_type OR by paid plan without subscription
const isVIP = profile.plan_type === 'vip' || (isPro && !profile.stripe_subscription_id);
```

### 6. Update Username Prefix Logic

VIP accounts should NOT have the "tap" prefix (like Pro accounts):

```typescript
// In create-personal-account edge function and UI
const publicUsername = planType === "free" 
  ? (username.toLowerCase().startsWith("tap") ? username.toLowerCase() : `tap${username.toLowerCase()}`)
  : username.toLowerCase(); // monthly, yearly, OR vip
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/personalPlanLimits.ts` | Add VIP plan config, update helper functions |
| `src/pages/admin/AdminPersonalAccounts.tsx` | Add VIP option to plan selector, update type |
| `src/components/personal/PersonalBillingTab.tsx` | Update VIP detection to include explicit plan_type |
| `supabase/functions/create-personal-account/index.ts` | Ensure VIP is treated like paid (no tap prefix) |

---

## Visual Representation

**Admin Create Account Modal:**
```text
┌──────────────────────────────────────┐
│ Plan Type                            │
├──────────────────────────────────────┤
│ ▼ Free (tap prefix)                  │
│   ✨ TapAway VIP (Free forever)      │ ← NEW
│   Pro Monthly ($10/mo)               │
│   Pro Yearly ($75/yr)                │
└──────────────────────────────────────┘
```

**Billing Tab for VIP Users:**
```text
┌──────────────────────────────────────┐
│ 👑 Current Plan          [VIP Access]│
│                                      │
│ You have complimentary full access   │
│ to all features!                     │
│                                      │
│ $0 forever                           │
│                                      │
│ ✨ Enjoy all premium features!       │
│                                      │
│ (No billing buttons shown)           │
└──────────────────────────────────────┘
```

---

## Technical Notes

- VIP is stored as `plan_type: 'vip'` in the database
- VIP accounts get `subscription_status: 'active'` but NO `stripe_subscription_id`
- Feature access: VIP has identical permissions to Pro (monthly/yearly)
- VIP accounts don't have the "tap" username prefix
- VIP accounts cannot downgrade (no billing buttons shown)
