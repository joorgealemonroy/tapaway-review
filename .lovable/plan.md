## Problem

VIP list signups on restaurant hubs are failing with "Something went wrong." Postgres logs confirm the cause:

```
new row violates row-level security policy for table "restaurant_sms_subscribers"
```

The current INSERT policy on `restaurant_sms_subscribers` is:

```sql
WITH CHECK (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = restaurant_sms_subscribers.restaurant_id))
```

The `EXISTS` subquery runs under the visitor's role (anon). Anon does not have a permissive SELECT policy on `restaurants` (only the owner can read most rows), so the subquery returns false → insert blocked.

The personal equivalent (`personal_email_captures`) already uses `WITH CHECK (true)` and works fine — the foreign key on `restaurant_id` already guarantees the restaurant exists, so the EXISTS check is redundant.

## Fix

Single migration that swaps the restaurant SMS opt-in policy for an unconditional one, matching the personal opt-in pattern.

```sql
DROP POLICY "Anyone can subscribe to a restaurant SMS list" ON public.restaurant_sms_subscribers;

CREATE POLICY "Anyone can subscribe to a restaurant SMS list"
ON public.restaurant_sms_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

FK constraint on `restaurant_id` keeps the relationship valid; owner-only SELECT/UPDATE/DELETE policies stay untouched so subscriber data remains private.

## Verification

1. Open a restaurant hub as a logged-out visitor → tap "Join our VIP Text List" → submit name + phone → expect success toast.
2. Repeat on a personal hub VIP block → already working, confirm no regression.
3. Confirm owner dashboard subscriber count increments.

No frontend changes needed.
