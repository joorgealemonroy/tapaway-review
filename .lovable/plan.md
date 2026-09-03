# One-time "cards ready" email to Muchas Gracias Mexican Food

A single, hardcoded administrative send. No form, no reusable endpoint, no database record, no client-accessible sending feature. The temporary function is deleted after the send is confirmed successful.

## Recipient and envelope
- **To:** ruizfamilyinc@yahoo.com
- **From:** no-reply sender from `EMAIL_FROM` (e.g. `TapAway <no-reply@tapaway.co>`)
- **Reply-To:** omitted — the copy directs replies to tap@tapaway.co
- **Subject:** Your Muchas Gracias Mexican Food TapAway page is ready
- **Idempotency-Key:** `muchas-gracias-cards-ready-2026-09-03` (Resend dedupes for 24h only; deleting the function is the permanent guard)

## Attachments (attached, never inline)
- `muchas-gracias-tapaway-card-front.png` (from IMG_5176.png, 835 KB → ~1.09 MB base64)
- `muchas-gracias-tapaway-card-back.png` (from IMG_5177.png, 678 KB → ~0.89 MB base64)

Combined ~2 MB encoded, far below Resend's 40 MB limit. Each attachment object contains only:

```json
{ "filename": "muchas-gracias-tapaway-card-front.png", "content": "<base64>" }
```

No `content_type`, no `content_id`, no inline disposition.

## Exact plain-text copy

```text
Hi Ismael,

We're excited to let you know that your Muchas Gracias Mexican Food TapAway page is finished and ready:

https://tapaway.co/muchasgraciasmexicanfood

Your TapAway cards have also been printed. I attached pictures so you can see how they came out, and we'll be shipping them out tomorrow.

Once they arrive, feel free to reach out with any questions or anything you'd like adjusted. I'll personally help make sure everything is set up exactly how you want it.

Please do not reply to this email — it is not monitored.
Email us at tap@tapaway.co or text +1 (909) 285-6321.

You'll also be able to make updates anytime through your TapAway dashboard, but we're always here if you need any help.

Thank you for choosing TapAway — we're excited to have Muchas Gracias Mexican Food on board!

Best,
Jorge
TapAway
https://tapaway.co
```

## Exact HTML copy
The same wording, in the existing TapAway email shell (white card on `#f9fafb`, TapAway wordmark header, teal `#0d9488` CTA button linking to https://tapaway.co/muchasgraciasmexicanfood), with the "do not reply" line rendered as a highlighted box containing the mailto link for tap@tapaway.co and the tel link for +1 (909) 285-6321. Paragraph order and sentences match the plain-text block exactly.

## Technical approach
1. Base64-encode both photos **at implementation time** and embed the strings in the function source. No runtime dependency on the upload mount.
2. Create temporary edge function `send-muchas-gracias-cards-ready`:
   - Accepts **no** email parameters. Recipient, subject, HTML, text, filenames are constants.
   - Reads only `RESEND_API_KEY`, `EMAIL_FROM`, and a temporary one-time invocation secret from server-side env. No Supabase client, no service-role key.
   - **Invocation auth:** requires an `x-admin-invoke-token` header matching a dedicated one-time secret (generated for this send only). Any request without it gets 401. Not publicly callable.
   - POSTs to Resend `/emails` with `from`, `to`, `subject`, `html`, `text`, `attachments`, and the `Idempotency-Key` header.
3. Deploy, invoke **exactly once** with the token.
4. Verify `response.ok` **and** a non-empty `id` in the Resend response before anything else. Report that message ID.
5. On confirmed success: delete the function directory, undeploy it, and delete the one-time invocation secret.
6. On failure: keep the function deployed for a controlled retry; report the Resend status and error body.

## Out of scope
No database changes, no RLS changes, no UI, no reusable transactional template, no marketing content.
