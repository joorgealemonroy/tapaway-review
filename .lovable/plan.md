# One-time "cards ready" email to Muchas Gracias Mexican Food

A single, hardcoded administrative send. No form, no reusable endpoint, no database record, no client-accessible sending feature. The temporary function is deleted after the send succeeds.

## Email content (all hardcoded)
- **To:** ruizfamilyinc@yahoo.com
- **From:** no-reply sender (`EMAIL_FROM`, e.g. `TapAway <no-reply@tapaway.co>`)
- **Subject:** Your Muchas Gracias Mexican Food TapAway page is ready
- **Body (HTML + plain-text versions):** Jorge's message — page live at https://tapaway.co/muchasgraciasmexicanfood, cards printed (photos attached), **shipping tomorrow**, dashboard self-service, personal help available.
- **Contact note:** clearly states *do not reply to this email* — email **tap@tapaway.co** or text **+1 (909) 285-6321**.
- **Attachments (not inline):**
  - `muchas-gracias-tapaway-card-front.png`
  - `muchas-gracias-tapaway-card-back.png`
- **Idempotency-Key:** fixed value, e.g. `muchas-gracias-cards-ready-2026-09-03`.

## Technical approach
1. Base64-encode both uploaded photos **at implementation time** and embed the strings in the function source, so runtime never depends on the upload mount.
2. Create a temporary edge function `send-muchas-gracias-cards-ready`:
   - Accepts no email parameters — recipient, subject, HTML, text, filenames are all constants.
   - Reads only `RESEND_API_KEY` and `EMAIL_FROM` from server-side secrets. No Supabase client, no service-role key.
   - POSTs to Resend `/emails` with `html`, `text`, `attachments` (base64, `content_type: image/png`, no `content_id`/inline disposition), `reply_to: tap@tapaway.co`, and the `Idempotency-Key` header.
   - Returns the Resend message ID.
3. Deploy, invoke **exactly once**, capture and report the Resend message ID.
4. Delete the function directory and undeploy it so it can never be invoked again.

## Naming
Everything uses "cards-ready" wording, not "cards-shipped" — the cards ship tomorrow.

## Out of scope
No database changes, no RLS changes, no UI, no reusable transactional template.
