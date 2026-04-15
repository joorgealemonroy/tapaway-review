

# Connect sugarbloomcakery to Stripe Billing

## Problem
The `personal_profiles` record for `sugarbloomcakery` has `plan_type: monthly` and `subscription_status: active`, but the three Stripe fields are null:
- `stripe_customer_id` → null
- `stripe_subscription_id` → null  
- `stripe_billing_email` → null

This causes the billing tab to show "Set up Billing" instead of "Manage Subscription".

## Plan

### Step 1: Look up Stripe customer by email
Use the `create-billing-portal` or a direct Stripe API call via edge function to find the customer record for `eric92.aguilar@yahoo.com`. This will return the `cus_xxx` customer ID and associated `sub_xxx` subscription ID.

I'll invoke the Stripe API through an edge function curl to:
```
stripe.customers.list({ email: 'eric92.aguilar@yahoo.com', limit: 1 })
```
Then retrieve the subscription from that customer.

### Step 2: Update the database record
Once I have the real Stripe IDs, update the profile using the insert tool:
```sql
UPDATE personal_profiles 
SET stripe_billing_email = 'eric92.aguilar@yahoo.com',
    stripe_customer_id = 'cus_XXXXX',
    stripe_subscription_id = 'sub_XXXXX'
WHERE id = 'cc06cb55-87ab-4dc7-88f7-073d3bb38d27';
```

This will make the "Manage Subscription" button appear on the billing tab, linking to the Stripe customer portal where the user can manage their plan.

### Files changed
- No code changes needed — the frontend already handles this correctly when the fields are populated.
- Database update only (via insert tool).

