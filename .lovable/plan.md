

# Sales Rep Portal Rebuild — Tiered Commissions + Trial-Safe Logic

## Overview

Replace the flat $50/close commission with tiered rates (Restaurant vs Business Lite), add 60-day clawback on monthly upfronts, implement a point-based $600 monthly bonus, and protect all commissions behind a `trial_pending` state until real money is collected. The `invoice.paid` handler uses state-machine logic (not `billing_reason` filtering) to handle both post-trial and instant Day 1 payments.

## Commission Lifecycle

```text
checkout.session.completed (rep_portal source)
  → commission created as trial_pending, points_value = 0

invoice.paid (amount_paid > 0)
  Look up commission by stripe_subscription_id:
  IF status = trial_pending:
    → First real charge (post-trial OR instant Day 1)
    → Annual: trial_pending → available
    → Monthly: trial_pending → pending, clawback_until = now + 60 days
    → Set points_value (1.0 or 0.5), bonus trigger fires
  IF status = available OR pending:
    → Subsequent charge → create NEW recurring commission (available)

customer.subscription.deleted
  → trial_pending → voided
  → pending (in clawback) → clawed_back
```

## 1. Database Migration

### Alter `commissions` — add columns:
- `plan_tier` text nullable ('restaurant' | 'business_lite')
- `commission_type` text nullable ('upfront' | 'recurring' | 'bonus')
- `billing_cycle` text nullable ('monthly' | 'annual')
- `clawback_until` timestamptz nullable
- `points_value` numeric default 0
- `stripe_subscription_id` text nullable

### Alter `rep_compensation_settings` — add tiered columns:
- `restaurant_annual_upfront` (60), `restaurant_annual_recurring` (40)
- `restaurant_monthly_upfront` (30), `restaurant_monthly_recurring` (4)
- `lite_annual_upfront` (25), `lite_annual_recurring` (15)
- `lite_monthly_upfront` (10), `lite_monthly_recurring` (1.50)
- `bonus_point_threshold` numeric default 15
- `restaurant_point_value` numeric default 1.0
- `lite_point_value` numeric default 0.5
- `clawback_days` integer default 60
- Update `bonus_amount` default to 600

### Replace `check_and_create_bonus` trigger function:
Sum `points_value` from commissions where `commission_type = 'upfront'` in current period. Award $600 bonus once per month when >= threshold. Only rows with `points_value > 0` count (trial_pending excluded automatically).

## 2. Update `stripe-webhook` — Three Handlers

### `checkout.session.completed` (rep_portal source):
- Read `plan_tier` and `billing_cycle` from metadata
- Create upfront commission: `status = 'trial_pending'`, `points_value = 0`, store `stripe_subscription_id`
- Existing fulfillment/restaurant logic unchanged

### New: `invoice.paid` handler
- Skip if `amount_paid <= 0`
- Get subscription ID from invoice
- Query `commissions` for matching `stripe_subscription_id`
- **State machine**:
  - If found with `status = 'trial_pending'`: first real payment. Update to `available` (annual) or `pending` with `clawback_until = now + 60 days` (monthly). Set `points_value`.
  - If found with `status IN ('available', 'pending')`: subsequent payment. Create new recurring commission with `status = 'available'`.
  - If not found: not a rep sale, skip.

### Update `customer.subscription.deleted`:
- Find `trial_pending` commissions by subscription → update to `voided`
- Find `pending` commissions within clawback → update to `clawed_back`

## 3. Update `create-rep-checkout`

Replace 3 plan options with 4 tiers:
- `solo_monthly` ($15/mo) — plan_tier: business_lite, billing_cycle: monthly
- `solo_annual` ($150/yr) — plan_tier: business_lite, billing_cycle: annual
- `venue_monthly` ($39/mo) — plan_tier: restaurant, billing_cycle: monthly
- `venue_annual` ($390/yr) — plan_tier: restaurant, billing_cycle: annual

Use dynamic product/price creation (same pattern as `create-checkout-session`). Add `plan_tier` and `billing_cycle` to Stripe session metadata.

## 4. Redesign `RepHome.tsx`

### Earnings cards (2x2 grid):
- **Available Balance** (sum where status = 'available')
- **Pending Clawback** (sum where status = 'pending')
- **In Free Trial** (sum where status = 'trial_pending')
- **Total Paid** (sum where status = 'paid')

### Bonus Tracker:
- Progress bar: "{points} / 15 Points → $600 Bonus"
- Points = sum of `points_value` from upfront commissions this month

### Compensation Breakdown:
- Collapsible card explaining tiers, clawback rules, trial flow, and point system

## 5. Redesign `RepCommissions.tsx`

### Filters: all | trial_pending | available | pending | paid | voided | clawed_back
### Type filter: all | upfront | recurring | bonus
### Table columns: Date | Restaurant | Plan Tier | Type | Points | Amount | Status (color badges) | Clawback info
### Stats: Available | Pending | In Trial | Points This Month

## 6. Redesign `RepClose.tsx`

4 plan cards with commission preview:
- Solo Pro Monthly ($15/mo) → "$10 upfront + $1.50/mo recurring · 0.5 pts"
- Solo Pro Annual ($150/yr) → "$25 upfront + $15/yr recurring · 0.5 pts"
- Venue Pack Monthly ($39/mo) → "$30 upfront + $4/mo recurring · 1 pt"
- Venue Pack Annual ($390/yr) → "$60 upfront + $40/yr recurring · 1 pt"

Note: "Commissions activate after customer's free trial ends"

## 7. Update `AdminCompSettings.tsx`

Replace single base commission input with tiered fields for all 8 rates, bonus point threshold, bonus amount, and clawback days.

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | **New** — alter commissions + rep_compensation_settings, replace bonus trigger |
| `supabase/functions/stripe-webhook/index.ts` | **Modify** — trial_pending on checkout, invoice.paid state-machine handler, subscription.deleted voiding/clawback |
| `supabase/functions/create-rep-checkout/index.ts` | **Modify** — 4 plan tiers with dynamic pricing + metadata |
| `src/pages/rep/RepHome.tsx` | **Modify** — earnings overview with trial_pending, point-based bonus tracker, comp breakdown |
| `src/pages/rep/RepCommissions.tsx` | **Modify** — new statuses, points column, clawback display |
| `src/pages/rep/RepClose.tsx` | **Modify** — 4 plan cards with commission + points preview |
| `src/pages/admin/AdminCompSettings.tsx` | **Modify** — tiered settings fields |

