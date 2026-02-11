

# Fix: Stop matching existing users by Stripe billing email

## Root Cause

The logs confirm the issue clearly:

```
Account email: abel@tapaway.co | Stripe billing email: supajor@icloud.com
Found existing user: bc758374-1696-4da5-9a47-48209f50eb81 email: supajor@icloud.com
Updated existing profile
```

Line 112-114 of `verify-personal-checkout/index.ts` searches for existing users matching EITHER `accountEmail` OR `customerEmail`:

```typescript
const existingUser = existingUsers?.users.find(
  u => u.email === accountEmail || u.email === customerEmail
);
```

Since `supajor@icloud.com` already exists in the system, it matches on `customerEmail` and hijacks that account instead of creating a new `abel@tapaway.co` user.

## The Fix

**File: `supabase/functions/verify-personal-checkout/index.ts`** (lines 110-114)

When `signupEmail` is provided, ONLY look up by `accountEmail`. The billing email from Stripe should never be used to determine which account to use -- it's billing-only data.

```typescript
// Only match by accountEmail (the user's chosen email).
// Never match by billing email -- Apple Pay, Google Pay, etc. use
// a different email that belongs to someone else's account.
const existingUser = existingUsers?.users.find(
  u => u.email === accountEmail
);
```

This ensures:
- `abel@tapaway.co` is not found (no existing user) -> a NEW user is created with that email
- `supajor@icloud.com` is ignored during lookup, even though it exists in the system
- The Stripe billing email is still stored in `stripe_billing_email` on the profile for reference

## Files

| File | Change |
|------|--------|
| `supabase/functions/verify-personal-checkout/index.ts` | Line 112-114: Remove `customerEmail` from user lookup when `signupEmail` is provided |

