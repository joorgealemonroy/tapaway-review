## Diagnosis

Two separate problems are stopping the mass text:

1. **Stale deploy** — edge logs still show `userClient.auth.getClaims is not a function`. The `getUser` fix was written to disk but the function hasn't been redeployed yet, so the old code is still running and returning 500.
2. **Admin impersonation blocked** — even after redeploy, the function checks `profile.user_id !== userId` and returns 403. You're sending as `tap@tapaway.co` (admin) for the `@socials` profile, which is owned by a different user.

## Fix

Update `supabase/functions/send-mass-sms/index.ts`:

1. **Allow admin bypass.** After the ownership check fails, look up `has_role(userId, 'admin')`; if true, allow the send. Otherwise return 403.
2. **Identify the sender in the SMS.** Pull `full_name`, `contact_name`, and `username` from `personal_profiles`. Prepend the resolved name (preferred order: `full_name` → `contact_name` → `@username` → `"TapAway"`) to every message so recipients know who it's from. Final body becomes:

   ```
   {Sender Name}: {message}
   Reply STOP to opt out.
   ```

3. **Redeploy** the `send-mass-sms` function so the previous `getUser` fix and these new changes go live.

## Notes

- The 160-char composer limit only applies to the user-typed body; the sender prefix and STOP suffix are appended server-side. Twilio supports up to 1600 chars per message and segments automatically — no limit issue.
- No frontend changes required.
- No new secrets required (Twilio + Lovable API key already configured).
