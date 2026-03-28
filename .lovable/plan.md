

# Finalize 3-Step Onboarding with Trial Badges, $0 Checkout & Dynamic Shipping Buffer

## Summary
Overhaul onboarding UI to lead with free trial messaging, show $0 due today, and implement dynamic Stripe trial periods (Solo: 14 days, Venue: 21 days). Add `trial_ends_at` column to `restaurants` table.

---

## Database Migration

Add `trial_ends_at` to the `restaurants` table:

```sql
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
```

---

## Changes to `src/pages/Onboarding.tsx`

### PLAN_DETAILS update
Add `trialDays` and `totalTrialDays` (includes 7-day shipping buffer):
- Solo: `trialDays: 7`, `totalTrialDays: 14`
- Venue: `trialDays: 14`, `totalTrialDays: 21`

### Step 1: Trial-Led Plan Selection
- Add emerald green badge (`bg-emerald-500`) top-left of each card: "7-Day Free Trial" / "14-Day Free Trial"
- Keep "Most Popular" badge top-right on Venue card
- Subtitle: Solo = "For Barbers & Personal Brands. Includes **3 Smart Cards**." / Venue = "For Restaurants & Retail. Includes **15 Smart Cards**."
- Fixed bottom CTA stays "Continue"

### Step 2: Loss Protection Upsell
- Price line: "Loss Protection — $5/mo ($0 Today)"
- CTA: "Add Protection — $0 Today"
- Skip text stays the same
- Footer note below skip: "Standard billing starts after your trial ends. Cancel anytime."

### Step 3: Business Info + $0 Checkout
- Replace price summary with a $0 "Due Today" breakdown table:
  - Plan: $0.00
  - Loss Protection (if added): $0.00
  - Shipping: $0.00
  - Total Due Today: **$0.00**
- Below table: "After trial: $[price]/mo" (includes protection if selected)
- Disclaimer: "Your trial starts after a 7-day shipping buffer so you get the full experience."
- Auth button label: "Start My Free Trial" (replacing "Continue with Google/Apple")

### completeSetup logic
- Calculate and store `trial_ends_at`: `new Date(Date.now() + totalTrialDays * 86400000).toISOString()`
- Pass `trial_ends_at` when inserting/updating the restaurant record

### Transitions
Already using framer-motion `slideVariants` — no change needed.

---

## Changes to `supabase/functions/create-checkout-session/index.ts`

- Accept `planType` from request body (validated: must be "solo" or "venue")
- Accept `hasProtection` boolean
- Calculate `trial_period_days` dynamically: solo = 14, venue = 21
- Add `subscription_data: { trial_period_days }` to Stripe session creation
- Pass `plan_type` and `has_protection` in session metadata

---

## Files Modified
1. `src/pages/Onboarding.tsx` — UI overhaul + trial_ends_at calculation
2. `supabase/functions/create-checkout-session/index.ts` — Dynamic trial days + metadata
3. New migration — `trial_ends_at` column on restaurants

