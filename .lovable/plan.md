## Goal

Add a public Twilio webhook to auto-sync STOP replies into our database, so opted-out numbers are removed from `personal_email_captures.sms_opt_in` immediately.

## Changes

### 1. New edge function: `supabase/functions/twilio-webhook/index.ts`

- Public (no JWT). Accepts `POST` from Twilio.
- Parse body via `await req.text()` + `URLSearchParams` (Twilio sends `application/x-www-form-urlencoded`).
- Extract `From` and `Body`.
- Normalize `Body`: `trim().toUpperCase()`. Match against `["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "QUIT", "END"]` (added `STOPALL` since Twilio recognizes it; spec keywords still included).
- If match:
  - Use service-role client (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS.
  - `update personal_email_captures set sms_opt_in = false where phone = <From>`.
  - Log row count for observability.
- Always respond `200 OK` with `Content-Type: text/xml` and body `<?xml version="1.0" encoding="UTF-8"?><Response></Response>` (empty TwiML — Twilio already sends its own STOP confirmation, we don't want to double-send).
- Handle `OPTIONS` with CORS headers (harmless).
- Wrap in try/catch; on error still return empty TwiML 200 so Twilio doesn't retry-storm, but log the error.

### 2. Config: `supabase/config.toml`

Add:
```toml
[functions.twilio-webhook]
verify_jwt = false
```

### 3. Deploy

Deploy `twilio-webhook` so the URL is live.

## Webhook URL to paste into Twilio Console

```
https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/twilio-webhook
```

In Twilio Console → Phone Numbers → your `TWILIO_FROM_NUMBER` → **Messaging** → "A message comes in" → Webhook → paste URL → method **HTTP POST** → Save.

## Notes / non-goals

- Phone match is exact string equality on the `From` value Twilio sends (E.164, e.g. `+15551234567`). Our existing `personal_email_captures.phone` values stored from the opt-in drawer are already E.164, so a direct `eq` match is correct. No normalization layer added in this pass.
- We do NOT handle `START`/`UNSTOP` re-opt-in here — out of scope for this phase. Can add in a follow-up.
- We do NOT validate Twilio's `X-Twilio-Signature` in this pass to keep the webhook simple and unblock testing. Recommend adding signature validation as a follow-up hardening step (requires `TWILIO_AUTH_TOKEN`, which we don't currently store — only `TWILIO_API_KEY`).
