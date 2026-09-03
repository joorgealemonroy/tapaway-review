# Send Muchas Gracias welcome/cards-shipped email

Send a one-off email to the new client with the two card photos attached. One-time send, not an automated template.

## Email details
- **To:** ruizfamilyinc@yahoo.com
- **From:** TapAway no-reply address (`TapAway <no-reply@tapaway.co>` via Resend, matching existing `EMAIL_FROM` convention)
- **Subject:** "Your Muchas Gracias Mexican Food TapAway page is live 🎉"
- **Body:** The provided message (page link https://tapaway.co/muchasgraciasmexicanfood, cards printed and shipping tomorrow, help available anytime, dashboard updates), plus a clear note: **do not reply to this email** — contact tap@tapaway.co or text +1 (909) 285-6321 instead.
- **Attachments:** the two uploaded card photos (IMG_5176.png front, IMG_5177.png back), attached via Resend's attachments field (base64), and optionally shown inline in the email.
- **Reply-To:** tap@tapaway.co (so stray replies still land somewhere monitored).

## Implementation
1. Create a single-use edge function `send-client-welcome-email` (service-role, rate-limited, input validated) that accepts recipient/subject/html/attachments and sends through Resend — OR simpler: a one-off admin-invoked function with the content hardcoded and only callable with the service key. Preferred: keep it minimal and one-off, since this is a manual concierge send, not a reusable feature.
2. Read the two images from the upload mount, base64-encode, pass as Resend attachments.
3. Invoke once, confirm Resend success response, report the message ID.

## Notes
- No database changes, no new tables, no RLS impact.
- If the reusable-function route is chosen, it stays admin-only and generic for future concierge sends.
