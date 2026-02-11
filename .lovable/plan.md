
# Show Stripe Billing Email in Personal Billing Tab

## Why

When users pay with Apple Pay (or similar), Stripe uses their Apple ID / billing email which may differ from their TapAway account email. Users need to know which email their subscription is under so they can find and cancel it in the Stripe portal.

## Changes

### 1. Add `stripe_billing_email` column to `personal_profiles`

```sql
ALTER TABLE personal_profiles ADD COLUMN stripe_billing_email text;
```

### 2. Store billing email during checkout verification

**File: `supabase/functions/verify-personal-checkout/index.ts`**

When creating/updating the personal profile, save `customerEmail` (from Stripe) as `stripe_billing_email` alongside the existing fields. This is the Stripe session's customer email -- separate from the account email.

### 3. Display billing email in the Billing tab

**File: `src/components/personal/PersonalBillingTab.tsx`**

- Add `stripe_billing_email` to the component's `profile` interface
- Below the "Manage Subscription" button (for paying, non-VIP users), show an info note:

```
Billing email: supajor@icloud.com
This is the email linked to your payment method. Use it to find your subscription in the billing portal.
```

Only shown when `stripe_billing_email` exists and differs from the account email. Styled as a subtle muted info block.

### 4. Pass the field from the dashboard

**File: `src/pages/personal/PersonalDashboard.tsx`**

Ensure `stripe_billing_email` is included in the profile query and passed to `PersonalBillingTab`.

## Technical Details

| File | Change |
|------|--------|
| Database migration | Add `stripe_billing_email text` column to `personal_profiles` |
| `supabase/functions/verify-personal-checkout/index.ts` | Store `customerEmail` as `stripe_billing_email` on profile |
| `src/components/personal/PersonalBillingTab.tsx` | Show billing email info when it differs from account email |
| `src/pages/personal/PersonalDashboard.tsx` | Include `stripe_billing_email` in profile select query |

## Expected Result

Users see their billing email in the Billing tab with a note explaining it's the email tied to their payment method, making it easy to locate and manage their subscription in the Stripe portal.
