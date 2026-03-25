

# Reset Password for tap@tapaway.co

## Problem
The `set-user-password` edge function requires a Stripe checkout session, so it can't be used for admin password resets. The auth guard blocks `resetPasswordForEmail`. We need a direct admin password reset.

## Solution
Create a small edge function `admin-reset-password` that uses the service role key to call `supabase.auth.admin.updateUserById()` with the new password. It will be restricted to only work for the super admin email (`tap@tapaway.co`) as a safety measure.

### New file: `supabase/functions/admin-reset-password/index.ts`

- Accepts `{ email, password }` in the request body
- Only allows `tap@tapaway.co` as the target email (hardcoded safety check)
- Uses service role to look up user by email via `get_auth_user_by_email` RPC, then calls `admin.updateUserById` to set the new password
- Returns success/error

### Execution
After deploying, invoke the function once to set the password to `Ilovelovie123!`, then confirm login works.

### Files
| File | Action |
|------|--------|
| **New**: `supabase/functions/admin-reset-password/index.ts` | One-time admin password reset function |

