

# Fix Billing Display: Grandfathered vs Paid Users

## Problem

The current `isVIP` logic is too broad — it flags `founding_pro` users and paid users missing a `stripe_subscription_id` as VIP, showing "$0 forever". This is wrong for standard paid clients. Additionally, there's no distinction between monthly ($15/mo) and annual ($150/yr) display.

## Changes — `src/components/personal/PersonalBillingTab.tsx`

### 1. Grandfathered Users (`founding_pro` or `vip`)
- Badge: "VIP Access" (green)
- Price: "$0 / forever"
- Description: "You have lifetime access to all premium features"
- **Hide** the "Manage Subscription" button entirely (no Stripe ID = Stripe portal crash)

### 2. Standard Paid Users (all other plan_types: `monthly`, `yearly`, `pro`, `business_lite`, etc.)
- Badge: "Business" (amber)
- Price logic based on `plan_type`:
  - If `plan_type === 'yearly'` → display **"$150 /year"**
  - Otherwise → display **"$15 /month"**
- If `stripe_subscription_id` exists → show "Manage Subscription" button (opens Stripe portal)
- If `stripe_subscription_id` is missing → show "Set up Billing" button that calls `onUpgrade()` to route them to checkout

### 3. Trial users
- Keep existing trial display (shows days left, then "$15/month")

### Simplified logic
```
isGrandfathered = plan_type === 'vip' || plan_type === 'founding_pro'
isAnnual = plan_type === 'yearly'
isPro = plan_type is not null (any plan = paid)
```

Remove the old `isVIP` variable that checked `!stripe_subscription_id`.

## Files

| File | Change |
|------|--------|
| `src/components/personal/PersonalBillingTab.tsx` | Rewrite billing display logic per above |

