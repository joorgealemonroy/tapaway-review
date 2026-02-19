

# Apply Display-Name Wrapping to All Email-Sending Functions

## Current State

The `send-custom-otp` function correctly wraps bare `EMAIL_FROM` values:
```
const rawFrom = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
const fromEmail = rawFrom.includes("<") ? rawFrom : `TapAway <${rawFrom}>`;
```

But two other functions still use the raw value, which could show an ugly sender address:

- `supabase/functions/send-auth-email/index.ts` (line 62)
- `supabase/functions/send-test-emails/index.ts` (line 142)

## Changes

### 1. `supabase/functions/send-auth-email/index.ts` (line 62)

Replace:
```
const fromEmail = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
```
With:
```
const rawFrom = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
const fromEmail = rawFrom.includes("<") ? rawFrom : `TapAway <${rawFrom}>`;
```

### 2. `supabase/functions/send-test-emails/index.ts` (line 142)

Same fix:
```
const rawFrom = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
const fromEmail = rawFrom.includes("<") ? rawFrom : `TapAway <${rawFrom}>`;
```

Both functions will be redeployed after changes.

