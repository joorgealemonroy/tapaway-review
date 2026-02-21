
# Tiered Affiliate Commission System

## Problem

The affiliate commission system has two gaps:

1. **Commissions are never created.** The code logs referrals in `affiliate_referrals` but the comment says commissions are "deferred until trial converts." However, there is no webhook handler for `customer.subscription.updated` (trial-to-active conversion), so **no commissions are ever recorded**.

2. **No tiered rates.** The current `affiliate_settings` table has a single flat `commission_per_referral` ($5.00). Your new requirements need tiered rates based on referral count and signup type (free vs paid).

## New Commission Tiers

| Signup Type | First 25 Referrals | After 25 |
|-------------|-------------------|----------|
| Free        | $3.00             | $5.00    |
| Paid        | $5.00             | $8.00    |

## Changes

### 1. Update `affiliate_settings` table

Replace the single `commission_per_referral` column with four new columns:

- `commission_free_base` (default $3.00) -- free signup, first 25
- `commission_free_bonus` (default $5.00) -- free signup, after 25
- `commission_paid_base` (default $5.00) -- paid signup, first 25
- `commission_paid_bonus` (default $8.00) -- paid signup, after 25
- `bonus_threshold` (default 25) -- the count at which rates bump up

Keep the old `commission_per_referral` column for backward compatibility but it will no longer be used.

### 2. Create commission at signup time (for free users)

Update `PersonalSignupComplete.tsx` to create an `affiliate_commissions` record immediately when a free user signs up via a referral link. The commission amount is calculated based on how many prior referrals the affiliate has.

### 3. Add webhook handler for paid conversions

Add a `customer.subscription.updated` event handler in `stripe-webhook/index.ts` that detects when a subscription transitions from `trialing` to `active`. When this happens:
- Look up the user's `personal_profile` by `stripe_customer_id`
- Check if they have a `referred_by` code
- Look up the affiliate and count their prior referrals
- Insert a commission at the appropriate tiered rate (paid tier)

### 4. Update Admin Settings UI

Update `AffiliateSettings.tsx` to show the four new rate fields and the bonus threshold instead of the single flat rate.

### 5. Update Affiliate Dashboard display

Update `AffiliateDashboard.tsx` to show the tiered commission structure in the "Commission Rules" card so affiliates understand the tiers.

---

## Technical Details

### Database Migration

```text
ALTER TABLE affiliate_settings
  ADD COLUMN commission_free_base numeric NOT NULL DEFAULT 3.00,
  ADD COLUMN commission_free_bonus numeric NOT NULL DEFAULT 5.00,
  ADD COLUMN commission_paid_base numeric NOT NULL DEFAULT 5.00,
  ADD COLUMN commission_paid_bonus numeric NOT NULL DEFAULT 8.00,
  ADD COLUMN bonus_threshold integer NOT NULL DEFAULT 25;

UPDATE affiliate_settings SET
  commission_free_base = 3.00,
  commission_free_bonus = 5.00,
  commission_paid_base = 5.00,
  commission_paid_bonus = 8.00,
  bonus_threshold = 25;
```

### Commission Calculation Logic (used in both frontend and webhook)

```text
1. Count total referrals for this affiliate from affiliate_referrals
2. If count <= threshold:
     use base rate (free_base or paid_base)
   Else:
     use bonus rate (free_bonus or paid_bonus)
3. Determine free vs paid from the user's plan_type
4. Insert into affiliate_commissions with calculated amount
```

### Files Modified

- **Database**: Add 5 new columns to `affiliate_settings`
- **`src/pages/personal/PersonalSignupComplete.tsx`**: Create commission immediately for free signups
- **`supabase/functions/stripe-webhook/index.ts`**: Add `customer.subscription.updated` handler for paid conversion commissions
- **`src/components/admin/affiliate/AffiliateSettings.tsx`**: Show tiered rate fields
- **`src/pages/affiliate/AffiliateDashboard.tsx`**: Update commission rules display
