# In-Person Close — minimal version

Close Fish Hooks at the table: open their finished presentation, show plans, they pay through Stripe, the webhook activates the existing hub, and they get passwordless dashboard access by email. No account, no password, no login during the sale.

Solo hubs only (`personal_profiles`). Restaurant hubs untouched.

## What already exists and gets reused (no rebuild)

- **`/claim` page** — already loads a solo hub, shows its name, photo, banner and live stats, renders the three plans, and starts checkout. This becomes the presentation page.
- **The three plans** — $20/mo, $25/mo with Card Club, $199/yr — already resolve to real Stripe products and prices inside `create-claim-checkout`. No new prices, nothing hardcoded.
- **Stripe Checkout** — already collects email and billing details and offers Apple Pay / Google Pay. No account before payment.
- **Signed Stripe webhook** — already verifies signatures and handles subscription and invoice events.
- **Passwordless magic link** — the existing send + verify pair and token table already work; reused as-is for the access email.
- **Admin unified accounts table** — where the Close Sale action attaches.
- **QR + copy-link UI** — already built on the rep close screen; the same pieces are reused in the admin dialog.

There is no existing hub-claim token, so this adds a short-lived signed token (see Security).

## Changes

### 1. Presentation layout on `/claim`
Reorganize the existing page (visual/layout work, same data):
1. "Your TapAway setup is ready" — business name, logo/branding, button to preview their live hub.
2. What TapAway does — only shipped features: everything in one place, easier Google reviews, quick access to menu/socials/directions/contact, physical NFC and QR cards, analytics, owner dashboard, done-for-you setup, update anytime without reprinting cards.
3. Already prepared for this business — checklist ticked from their real data (hub built, branding, links, Google review link, socials, menu/website, cards, dashboard).
4. Choose a plan — the existing three plans with monthly/yearly framing, savings and a recommended badge.
5. One clear checkout button. No admin chrome anywhere.

### 2. Admin "Close Sale"
A Close Sale action on eligible demo/trial solo hubs in the unified accounts table, opening a small dialog with: Open Presentation, Copy Link, Show QR Code. Nothing else.

### 3. Checkout
`create-claim-checkout` is modified to require the signed token, and to write this metadata on both the session and the subscription: `hub_id`, `hub_type: personal_profile`, `type: in_person_close`, `checkout_attempt_id`, plan and interval. Each attempt gets its own idempotency key, so a customer can retry after an expired or abandoned session; duplicate purchases are prevented separately by the active-subscription guard.

### 4. Activation moves to the webhook
Today `verify-claim-checkout` activates the hub on the browser redirect. Activation moves into the signed webhook; the redirect only reads status for the success screen.

On `checkout.session.completed` with `type: in_person_close`, activation is not triggered by the event name alone. The webhook first confirms real paid state: the session is complete and paid (or requires no payment), a subscription and customer exist, the subscription is in a live state with a recognized price, and the hub is eligible (exists, is a solo hub, has no other active subscription). Anything short of that is logged and left alone. When it passes, the webhook:
- leaves the hub, URL, cards, links, analytics, branding and settings untouched,
- flips demo/trial to active,
- saves Stripe customer, subscription, price, plan, interval and status,
- resolves ownership by the email rule below,
- sends the existing passwordless dashboard-access email.

**Email ownership rule (exact):** normalize the Stripe-collected email (trim, lowercase) → look for an existing verified user identity with that email → if found, attach this solo hub to that user → if not, create only the minimum identity needed for passwordless access → never reassign or overwrite another hub's owner just because emails differ, and never merge two accounts.

Existing subscription updated / deleted / invoice paid / invoice payment failed branches keep status current. Handling is idempotent: replayed events and repeat clicks never duplicate a hub or attach a second active subscription. Abandoned checkout leaves the hub as demo/trial.

### 5. Success screen
"Welcome to TapAway! Your [Business] account is now active. We sent your dashboard access link and payment confirmation to [email]." Buttons: View My TapAway Hub and Done. No dashboard visit required.

### 6. Admin status only
The accounts table shows just: Demo/Trial, Checkout Started (only if already derivable), Active, Payment Failed, Past Due, Canceled. No funnel tracking, no new tables.

## Security

- A customer cannot claim an arbitrary hub by editing a slug or id. The presentation link carries a signed token encoding the hub id and an expiry, signed server-side with a new backend-only secret. Lifetime is 24 hours so the presentation and QR never die mid-conversation; the active-subscription guard, not the token, is the real duplicate-purchase protection.
- The token is generated by an admin-authenticated call and verified in the backend before any Checkout session is created. A raw hub id from the browser is never accepted.
- Nothing beyond presentation-safe fields is exposed through the link.
- Webhook remains signature-verified, state-verified and idempotent, with a guard against a second active subscription on the same hub.


## Explicitly not in this version

`sales_offers` and `sales_offer_events` tables, funnel/open/scan/plan/abandonment tracking, Mark Not Interested, link revocation and replacement, owner-email correction, conversion detail pages, extra edge functions, full offer lifecycle.

## Technical notes

- No schema migration required; a signing secret is added for the token.
- Files touched: `src/pages/ClaimHubPage.tsx` (layout + token in URL + success screen), `src/components/admin/AdminUnifiedAccountsTable.tsx` (Close Sale dialog), `supabase/functions/create-claim-checkout/index.ts` (token verification + metadata + idempotency), `supabase/functions/stripe-webhook/index.ts` (new `in_person_close` branch), `supabase/functions/verify-claim-checkout/index.ts` (reduced to read-only status), plus a small token sign/verify helper in `supabase/functions/_shared/`.
- Verification: dry run on Fish Hooks — open presentation, scan the QR on a phone, pay monthly and yearly in test conditions, confirm one subscription, unchanged hub URL and content, access email signs in without a password, abandoned checkout leaves the hub as a demo, replayed webhook events change nothing.
