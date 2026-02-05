

# Change @julio to VIP Account

## Current Status

| Field | Current Value |
|-------|---------------|
| Username | @julio |
| Email | joxov50105@sepole.com |
| Plan Type | `yearly` |
| Subscription Status | `active` |
| Stripe Subscription | None (null) |

---

## Required Change

Update the `plan_type` from `yearly` to `vip`.

### Database Update (Test Environment)

```sql
UPDATE personal_profiles 
SET plan_type = 'vip',
    subscription_status = 'active',
    updated_at = now()
WHERE username = 'julio';
```

---

## What This Changes

- **Admin UI**: Will show "VIP" instead of "yearly" in Personal Accounts
- **Billing Tab**: Will display "VIP Access" badge and hide subscription management
- **Features**: Full Pro features remain available (already has them with yearly)
- **No Stripe**: Already has no Stripe subscription, so no cancellation needed

---

## Live Environment Note

If @julio is using the **published site**, you'll also need to run this same SQL in the **Live** database via Cloud View → Run SQL (with Live selected).

