

# Link Stripe IDs to Reborn Wraps Profile + Handle Cancellation

## Context

The personal profile `26439acb-a9b2-46a1-bd26-d5e667bdf91a` currently has no `stripe_customer_id` or `stripe_subscription_id`. The user provided:
- Customer ID: `cus_UD6fiXdZsHQfGB`
- Subscription Item ID: `si_UD6f5kCVtWYBlx` (note: `si_` is a Stripe **Subscription Item**, not the subscription itself which starts with `sub_`)

The billing tab already supports showing "Manage Subscription" via Stripe portal when `stripe_customer_id` is set — but the webhook doesn't handle cancellation events.

## Changes

### 1. Database: Update profile with Stripe IDs

Update the personal profile to store the Stripe customer ID. For the subscription ID, `si_` is a subscription **item** — the actual subscription ID (`sub_...`) can be retrieved via the Stripe API at runtime, or we store the `si_` and the portal/manage flow still works since it only needs `stripe_customer_id`. We'll also update `plan_type` from `founding_pro` to `pro` and ensure `subscription_status` is `active`.

```sql
UPDATE personal_profiles
SET stripe_customer_id = 'cus_UD6fiXdZsHQfGB',
    plan_type = 'pro',
    subscription_status = 'active'
WHERE id = '26439acb-a9b2-46a1-bd26-d5e667bdf91a';
```

### 2. Edge function: Look up the real `sub_` ID from Stripe

Create a one-time lookup in the `manage-personal-subscription` function's portal action: if `stripe_subscription_id` is null but `stripe_customer_id` exists, fetch the active subscription from Stripe and backfill it. This way the `sub_` ID gets stored automatically.

In `supabase/functions/manage-personal-subscription/index.ts`, after loading the profile and before creating the portal session, add:

```ts
// Backfill subscription ID if missing
if (!profile.stripe_subscription_id && profile.stripe_customer_id) {
  const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 1 });
  if (subs.data.length > 0) {
    await supabase.from('personal_profiles').update({ stripe_subscription_id: subs.data[0].id }).eq('id', profileId);
  }
}
```

### 3. Stripe webhook: Handle `customer.subscription.deleted`

Add a handler in `supabase/functions/stripe-webhook/index.ts` for `customer.subscription.deleted`. When a subscription is cancelled:
- Find the personal profile by `stripe_customer_id`
- Set `subscription_status = 'canceled'` and `plan_type = 'free'`
- Archive premium blocks (photo_collage, email_capture) and excess links (same logic as the existing downgrade action in `manage-personal-subscription`)

### 4. Billing tab: Already works

The `PersonalBillingTab` already shows "Manage Subscription" linking to the Stripe billing portal when the user has a `stripe_customer_id` and is on a paid plan. The static portal URL `STRIPE_PORTAL_URL` is used. No changes needed here — once the DB is updated, the billing tab will show the correct UI.

## Files

| File | Change |
|------|--------|
| DB: `personal_profiles` | UPDATE stripe_customer_id, plan_type, subscription_status |
| `supabase/functions/manage-personal-subscription/index.ts` | Backfill sub ID from Stripe if missing |
| `supabase/functions/stripe-webhook/index.ts` | Add `customer.subscription.deleted` handler to deactivate account |

