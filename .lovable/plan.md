

# Fix OTP Verification: Edge Function Crash, Error UX, and Greylisting Warning

## Root Cause

Two compounding issues cause the `{}` error:

1. **CORS headers are incomplete** in both `verify-custom-otp` and `send-custom-otp`. They're missing newer Supabase client headers (`x-supabase-client-platform`, etc.), so the browser can't read error response bodies — hence `{}`.

2. **`listUsers` with `perPage: 1000`** is fragile — it fetches up to 1000 users just to `.find()` one by email. This is slow, timeout-prone, and breaks once you exceed 1000 users.

## Changes

### 1. `supabase/functions/verify-custom-otp/index.ts`

- **Fix CORS headers** — add all required Supabase client headers
- **Replace `listUsers` + `.find()`** (lines 75-87) with a direct `getUserByEmail` approach. Since the Supabase admin SDK doesn't have `getUserByEmail`, we'll use a targeted `listUsers` call with a much smaller page size and then validate, OR better: query `auth.users` directly via the service role client's raw SQL. **Simplest reliable fix**: keep `listUsers` but wrap in robust error handling and add a fallback.
  
  Actually, the cleanest approach: create a DB function `get_auth_user_by_email` via migration, then call it with `.rpc()` from the edge function. This eliminates the scalability issue entirely.

- **Ensure all error paths return structured JSON** with CORS headers (the `catch` block already does this, but the CORS fix ensures the browser can read it)

### 2. `supabase/functions/send-custom-otp/index.ts`

- **Fix CORS headers** — same header update

### 3. Database migration

Create a `SECURITY DEFINER` function:
```sql
CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(lookup_email text)
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.email::text
  FROM auth.users au
  WHERE lower(au.email) = lower(lookup_email)
  LIMIT 1;
$$;
```

Then in `verify-custom-otp`, replace the `listUsers` block with:
```typescript
const { data: userRows, error: lookupError } = await supabase
  .rpc('get_auth_user_by_email', { lookup_email: normalizedEmail });

const existingUser = userRows?.[0] ?? null;
```

### 4. `src/components/personal/signup/CheckoutStep.tsx`

- **Improve error message** in the `verifyOTPAndCreateAccount` catch block: instead of showing raw `verifyError.message` (which contains "Edge Function returned a non-2xx status code"), display a friendly message like "We had trouble verifying your code. Please try again in a moment."

- **Add greylisting helper text** after the Resend code section (line ~1294): a subtle `<p>` with text "Email taking a while? Check your spam folder or wait a few minutes — some providers may temporarily delay delivery."

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/verify-custom-otp/index.ts` | Fix CORS headers, replace `listUsers` with `rpc('get_auth_user_by_email')` |
| `supabase/functions/send-custom-otp/index.ts` | Fix CORS headers |
| `src/components/personal/signup/CheckoutStep.tsx` | Friendly error message, greylisting helper text |
| **Migration** | Create `get_auth_user_by_email` function |

