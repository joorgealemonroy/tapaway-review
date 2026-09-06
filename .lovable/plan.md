# In-Person Close: pay now, dashboard access later

Turn a finished demo hub (like Fish Hooks at `/fishhookseafood`) into a paying customer at the table — no account, no password, no login during the meeting.

## What already exists and gets reused

Most of this is already built; the plan extends it rather than starting over.

- **The customer sales page**: `/claim` already loads a hub by id or slug, shows its name, photo, banner, live stats, and the three plans, then sends the visitor to Stripe. It becomes the personalized presentation page.
- **The plans**: $20/mo, $25/mo with Card Club, $199/yr already resolve to real Stripe products and prices in the claim checkout function. No new prices, no hardcoded amounts.
- **Stripe Checkout**: already collects email, billing address, and supports Apple Pay / Google Pay. No account creation before payment.
- **The webhook**: the signed Stripe webhook already runs and handles subscription events.
- **Magic-link sign-in**: a working passwordless token system plus a send + verify pair of functions already exist and will send the "Access Your Dashboard" email.
- **QR + copy link UI**: the rep close screen already renders a checkout QR code and copy button; the same components get reused in admin.
- **Admin hub list**: the unified accounts table is where the new actions attach.

## What changes

### 1. A secure, per-business sales link

Each eligible demo hub gets an admin-generated, unguessable sales token stored in a new table (token hash only, plus who created it, when it expires, and whether it was revoked). The presentation opens at `/s/<token>`. The page reads only presentation-safe fields through a protected backend endpoint — no admin data, no internal statuses, no notes, no billing internals. Admins alone can create, replace, or revoke a link.

### 2. Admin "Close Sale"

A primary **Close Sale** button on every eligible demo/trial solo hub, plus: Copy Sales Link, Open Presentation, Show Checkout QR, Mark Not Interested, View Conversion Status. The QR opens the same secure page on the customer's phone.

### 3. The presentation page (customer-facing)

Five sections, all driven by that business's real data:

1. "Your TapAway setup is ready" — business name, logo/branding, and a button to preview the live hub.
2. What TapAway does — only features that exist today: one-place hub, easier Google reviews, quick links to menu/socials/directions/contact, physical NFC and QR cards, analytics, owner dashboard, done-for-you setup, update anytime without reprinting cards.
3. What's already included for this business — checklist ticked from actual data (hub built, branding, links, Google review link, socials, menu/website, cards prepared, dashboard prepared).
4. Choose a plan — monthly/yearly toggle, feature lists, cards included, yearly savings, recommended badge.
5. Checkout — one tap to Stripe, receipt-email wording, wallets supported.

No admin chrome anywhere on it.

### 4. Payment activates the account — via webhook only

The webhook becomes the source of truth. Today activation happens on the browser redirect; that moves into the webhook and the redirect only reads status.

On `checkout.session.completed` for a sales-link session, the system matches the exact prebuilt hub by id from Stripe metadata and:

- keeps the hub, URL, cards, links, analytics, branding and settings exactly as they are,
- flips demo/trial to active,
- saves customer id, subscription id, plan, billing interval, price id and status,
- uses the Stripe-collected email as the owner email, creating a user only if none exists for it, otherwise attaching the hub to that existing account,
- sends the "Access Your TapAway Dashboard" magic-link email (no password).

Subscription created/updated/deleted, invoice paid, and invoice payment failed keep billing status current. Every handler is idempotent — repeated events and double-clicks can't duplicate a business, a hub, or a subscription. An abandoned checkout leaves the hub in demo/trial.

### 5. Success screen

"Welcome to TapAway! Your [Business] account is now active. We sent your dashboard access link and payment confirmation to [email]." Buttons: View My TapAway Hub, Resend Dashboard Access Email, Done. No dashboard visit required.

### 6. Conversion tracking in admin

A per-business view showing: sales link status, presentation opened, QR scanned, plan selected, checkout started/abandoned, payment completed, plan and interval, customer email, access email sent, dashboard accessed, subscription status — with statuses Demo Ready, Presentation Opened, Checkout Started, Payment Processing, Active, Checkout Abandoned, Payment Failed, Past Due, Canceled. Actions: reopen presentation, copy link, show QR, resend access email, correct the owner email (re-verified by a fresh magic link to the new address), open hub, open their dashboard, open the Stripe subscription, revoke an unused link.

## Technical notes

- New tables: `sales_offers` (hashed token, hub id, created_by, expires_at, revoked_at, plan_selected, stripe ids, status timestamps) and `sales_offer_events` (append-only funnel events). RLS: admin-only reads/writes; anonymous access only through security-definer backend endpoints that take the token, never the hub id.
- New edge functions: `sales-offer-admin` (admin-authenticated: create/revoke/list/resend/update-email), `sales-offer-public` (token → presentation payload + funnel event logging, rate limited), `sales-offer-checkout` (token + plan → Stripe Checkout session with metadata: hub id, offer id, plan, interval, admin id).
- Reuses `create-claim-checkout`'s product/price resolution helpers so pricing stays in one place; adds `idempotency_key` per offer+plan to block duplicate subscriptions.
- Webhook: new `type: sales_offer` branch, guarded by a processed-event check, running before existing branches; the current claim-verify path is reduced to read-only status polling.
- Access email reuses the existing magic-link send/verify pair, retargeted to the hub owner with dashboard-landing wording.
- Scope: solo hubs (`personal_profiles`) only for now; restaurant hubs unchanged.
- Migrations are additive only; no existing column or row is repurposed.

## Verification

Dry run on Fish Hooks in Stripe test conditions: open presentation, scan QR on a phone, pick monthly then yearly, confirm one subscription per checkout, confirm the hub keeps its URL and content, confirm the access email arrives and signs in without a password, confirm an abandoned checkout leaves the hub as a demo, and confirm replayed webhook events change nothing.
