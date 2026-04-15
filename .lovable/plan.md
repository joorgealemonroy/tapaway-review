

# Fix Stripe Bypass for +1 Email Variants

## Problem
The bypass condition checks `userEmail.includes('+test')`, but the admin is using `tap+1@tapaway.co` which doesn't contain `+test`. The bypass is never triggered.

## Fix
In `src/pages/Onboarding.tsx` line 589, broaden the check to match any `+` alias of the admin email:

```typescript
// Before:
if (userEmail === 'tap@tapaway.co' || userEmail.includes('+test')) {

// After:
if (userEmail === 'tap@tapaway.co' || userEmail.endsWith('@tapaway.co') || userEmail.includes('+test')) {
```

This ensures any `@tapaway.co` email (tap+1@, tap+2@, etc.) triggers the bypass.

## Files Changed

| File | Action |
|------|--------|
| `src/pages/Onboarding.tsx` | Broaden admin bypass condition on line 589 |

