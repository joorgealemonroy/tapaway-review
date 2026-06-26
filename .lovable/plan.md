# SMS Feature Test Plan

Goal: end-to-end verify the three SMS flows using your verified phone number, without changing production behavior permanently.

## Pre-flight (one minute)

1. Confirm Twilio secrets are live: `TWILIO_API_KEY` (connector) and `TWILIO_FROM_NUMBER` are already set.
2. If on a Twilio trial account, make sure your test phone is in **Twilio Console → Verified Caller IDs**. Trial accounts cannot text unverified numbers.
3. Open two browser tabs:
   - Tab A: incognito → your live profile (the visitor view) on `tapaway.co/<your-slug>`.
   - Tab B: signed-in dashboard → SMS Marketing tab.

---

## Test 1 — Visitor opt-in → welcome SMS

1. In Tab A, tap **Join VIP Text List** on your profile.
2. Submit your real name + your verified phone in E.164 (`+15551234567`).
3. Expect:
   - Success toast in the form.
   - Welcome SMS arrives within ~10s with `"Reply STOP to cancel"` footer.
4. In Tab B, refresh the SMS Marketing tab and confirm **Total SMS Subscribers** incremented by 1.
5. If no SMS arrives, check edge function logs for `send-welcome-sms` (or whichever function the opt-in form invokes) for Twilio error codes — `21608` = unverified trial number, `21610` = recipient previously sent STOP.

---

## Test 2 — Mass-text composer (temporarily unlock)

The composer is gated by `SENDING_LOCKED = true` in `src/components/personal/SmsMarketingTab.tsx` while waiting on carrier approval. To test safely:

1. Temporarily flip `const SENDING_LOCKED = false;` in that file (and the equivalent in `RestaurantSmsMarketingTab.tsx` if testing the restaurant flow). **Do not deploy this change** — revert before publishing.
2. Make sure the only opted-in subscriber is your own test number (delete any other test rows from `personal_email_captures` / `restaurant_sms_subscribers` first so you don't accidentally text real users).
3. Compose a short message ("TapAway test ping"), click **Send Mass Text**, confirm the dialog.
4. Expect:
   - Toast: `Sent to 1 of 1 subscribers`.
   - SMS arrives on your phone with `"Reply STOP to opt out."` appended.
   - New row appears under **Recent campaigns** with `success_count = 1`.
5. Check `supabase--edge_function_logs` for `send-mass-sms` to confirm no Twilio failures.
6. Revert `SENDING_LOCKED` back to `true`.

---

## Test 3 — STOP / opt-out webhook

1. From your phone, reply **STOP** to the last TapAway SMS.
2. Twilio auto-replies with its standard unsubscribe confirmation (carrier-level block).
3. Twilio also POSTs to our `twilio-webhook` edge function. Verify:
   - `supabase--edge_function_logs` for `twilio-webhook` shows `twilio-webhook opted out N personal row(s) for +1555…`.
   - In the DB: `personal_email_captures.sms_opt_in` flips to `false` for your number (and `restaurant_sms_subscribers` too if applicable).
   - The dashboard subscriber count drops by 1 after refresh.
4. Re-subscribe by texting **START** to confirm round-trip (optional; Twilio handles START at carrier level — our DB row stays `false` unless they re-submit the opt-in form).

### Webhook plumbing sanity check (if STOP doesn't flip the row)

In Twilio Console → Phone Numbers → your `TWILIO_FROM_NUMBER` → **Messaging → A MESSAGE COMES IN**, the webhook should point at:

```
https://<project-ref>.functions.supabase.co/twilio-webhook
```

with HTTP POST. If it's blank or wrong, STOP keywords won't reach our DB.

---

## Technical notes

- `send-mass-sms` is invoked client-side via `supabase.functions.invoke`, so auth headers are forwarded automatically — no manual token needed.
- `twilio-webhook` runs with `verify_jwt = false` (it must, since Twilio is unauthenticated). It uses the service role to update both subscriber tables.
- Twilio error code reference: `21610` (STOP'd recipient), `21608` (unverified trial), `30007` (carrier filtered), `30003` (unreachable handset).
- I will **not** edit any code as part of this plan. You toggle `SENDING_LOCKED` locally just for Test 2 and revert.

---

## Deliverable after running

Tell me which of the three tests pass/fail and paste any Twilio error code you see — I'll dig in from there.
