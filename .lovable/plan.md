

# Fix: Hide Pricing During Founding Creator Promotion

## Problem
The CheckoutStep shows plan selection with Pro pricing ($6.25/mo, $10/mo, Free), but during the Founding Creator Access promotion (first 1,000 signups), all users should get Pro free for life — no plan picker, no pricing.

## Solution
Two changes:

### 1. `CheckoutStep.tsx` — Detect founding promotion and auto-assign `founding_pro`
- On mount, call `supabase.rpc("get_founding_count")` to check if spots remain
- If `count < 1000`: hide the plan selector entirely, show a "Founding Creator" banner instead (e.g., "You're getting Pro free for life!"), set effective plan to `founding_pro`, and skip Stripe checkout (go straight to OTP flow)
- If `count >= 1000`: show the normal plan selector as-is

### 2. `PersonalSignup.tsx` — Add `founding_pro` to the plan type
- Add `founding_pro` to the `SignupData.planType` union type so the checkout step can set it
- When founding is active, lock the plan to `founding_pro` similar to how VIP cards lock to `vip`

### UI During Founding Promotion (replaces plan selector)
- Single card: "🚀 Founding Creator Access — $0 forever" with a checkmark
- Feature list stays the same (Pro features)
- Order summary: "Total due today: $0"
- CTA button: "Create My TapAway" (no credit card icon)
- No "Change" button, no plan options

### Files Modified
- `src/components/personal/signup/CheckoutStep.tsx` — Add founding detection, conditional UI
- `src/pages/personal/PersonalSignup.tsx` — Add `founding_pro` to planType union

