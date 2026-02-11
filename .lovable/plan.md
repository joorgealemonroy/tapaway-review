

# Fix: `updateUser` is not a function in verify-personal-checkout

## The Problem

The edge function crashes at line 124 with:
```
TypeError: supabase.auth.admin.updateUser is not a function
```

The Supabase JS client's admin API uses `updateUserById(userId, attributes)`, not `updateUser(userId, attributes)`.

## The Fix

**File: `supabase/functions/verify-personal-checkout/index.ts`** (line 124)

Change:
```typescript
await supabase.auth.admin.updateUser(userId, {
```
To:
```typescript
await supabase.auth.admin.updateUserById(userId, {
```

That's it -- one method name fix. The function will then correctly set `must_set_password: true` on existing users, allowing the password to be applied and auto-login to succeed.

## Files

| File | Change |
|------|--------|
| `supabase/functions/verify-personal-checkout/index.ts` | Line 124: `updateUser` -> `updateUserById` |

