# Payment-First Onboarding + Card Club

## What exists today (checked in the code)

- **Routes:** home CTAs and `/start` (keeps `?card=` and other parameters) go to `/onboarding`. It has two steps: **plan** (4 or 15 cards, Yearly/Monthly) and **info** (Google business search or manual entry, phone, logo, then Google/Apple/email+password sign-in). Checkout happens only after sign-in.
- **Prices:** an exact, server-checked catalog with Solo $20/mo or $199/yr and Pro (venue) $39/mo or $390/yr, all with a 14-day trial. `create-checkout-session` checks the price again when checkout is created.
- **Checkout:** subscription mode. Stripe already collects email, billing address, phone and shipping address (US/CA/MX), and records plan, interval, campaign and Trybe details. A $1 card check runs through `verify-checkout` / `verify-trial-card`.
- **Webhook:** `stripe-webhook` handles `checkout.session.completed`, invoices and duplicate protection (`processed_stripe_events`). It already reads `card_club` from session details in one path.
- **Card Club today:** an existing $5/mo price (`price_1TMM0LDg8DaTuVNZUgZ4GtWJ`) sold separately through `create-card-order`, plus a welcome offer for personal accounts. Loss Protection is already off for public onboarding.
- **Card allowance today:** `request-more-cards` gives every active or trialing subscriber 4 or 15 cards per calendar month, whether or not they have Card Club. This conflicts with the new rules (see Decisions).
- **Login links:** `send-magic-link-email`, `verify-magic-link` and `magic_link_tokens` already exist.
- **Google Places:** searched through the backend (`lookup-place-id`, `GooglePlacesAutocomplete`).
- **Fulfillment:** `fulfillment_orders` and admin fulfillment/print queue pages already exist.

## New flow

```text
Landing -> Cards (4/15) + Billing -> Card Club (add / skip + confirm)
-> Stripe Checkout (no TapAway account) -> /welcome
   1 Find business (Google search, or name + city + optional link)
   2 Logo (upload or skip)
   3 Shipping (confirm Stripe address or edit)
   -> You're all set -> Dashboard ("We're building your TapAway")
```

## Build steps

1. **Landing:** rename CTAs to "Get My TapAway Cards" and add a short "We set everything up for you" message near the CTA. The design stays the same.
2. **Picker (`/onboarding`):** keep the current plan step, remove the info and sign-in steps, add a short Card Club panel with a skip confirmation, then Continue goes to a new public checkout function. Selections are saved right away, both on the device and in an anonymous checkout record.
3. **Public checkout function:** no sign-in needed. It reads only plan, interval and Card Club yes/no from the browser. The server picks the catalog price IDs, adds Card Club as its own line item when chosen, turns on Stripe-supported wallets (Apple Pay / Google Pay), and saves all required details (plan, quantity, cycle, price IDs, card_club, onboarding_version, source, attribution). It reuses the existing price IDs and creates no new Stripe products.
4. **Webhook makes the account:** on a successful checkout, the same email always links to the same user (never a duplicate). It then creates or links the subscription, the Card Club membership (or a declined record), the shipping address, the onboarding session and the initial card order. Repeated events are safely ignored. Anything unusual is flagged for admin review instead of failing.
5. **Return from Stripe:** `/welcome?session_id=` checks the session on the server, sends a login link, and signs the customer in through the existing magic-link system. If the redirect is lost, the webhook still captures the purchase, and the emailed link brings them back to their next step.
6. **Post-purchase steps:** each step saves to the onboarding session. White-glove statuses are `purchase_complete`, `business_identified` / `needs_business_research`, `logo_received` / `logo_needed`, `links_being_prepared`, `hub_ready`, `cards_ready_to_print`, `cards_printed`, `ready_to_ship`, `shipped`.
7. **Purchase email:** "Your TapAway is being built" with a dashboard link, sent through the existing email sending.
8. **Dashboard:** a progress panel, plus a Card Club card that is Active / next eligible date / Request Fresh Cards, or "Order Replacement Cards" for customers who declined or cancelled. There is never a join or rejoin button.
9. **Card Club request:** a server function checks that Card Club is active and paid, the main subscription is valid, the 30-day window has passed, and the address is on file. The server sets the quantity from the current plan. A unique record per eligibility period plus a row lock prevent double orders. It creates a replacement order linked to fulfillment and accepts an optional design-update note.
10. **Admin:** add Card Club and setup-status columns, and next-eligible and history views, to the existing Accounts and Fulfillment pages. Add an admin-only override.
11. **Analytics:** the listed funnel events are added through the existing `track-event` system, with no payment data.
12. **Existing customers:** current sign-in, dashboards, hubs and claim/rep/van checkouts stay as they are. The old onboarding sign-in path stays available only for in-progress sessions.

## Technical details

New tables (with grants and row-level security; owners can read their own rows, and only server functions can write):
- `checkout_intents`: anonymous selection, attribution, session id, status.
- `onboarding_sessions`: user, subscription, place id, business fields, logo, shipping, step, white-glove status.
- `card_club_memberships`: the fields from section 66. One per customer relationship, unique on the Stripe subscription.
- `card_club_redemptions`: membership, order, period start, quantity, address snapshot, design note, status, tracking. Unique on (membership, period).
- One central server function, `card_club_entitlement(membership)`, plus a setting `card_club_first_eligible_after_days` (default 30) and a configurable `reprint_price_cents` (blank until you approve a price; until then the UI says "Contact us for reprint pricing").
- Webhook: `customer.subscription.updated/deleted` and `invoice.payment_failed` update membership status per subscription item. A main subscription that is not active makes Card Club ineligible.

## Decisions I need from you

1. **Yearly + Card Club:** the $5 Card Club price is monthly, and a $199 or $390 plan is yearly. Stripe cannot put a yearly and a monthly price in one subscription through one Checkout. Pick one:
   a) a separate monthly Card Club subscription created right after checkout using the saved card (both items are shown in Checkout as text), or
   b) a yearly Card Club price ($60/yr) for yearly plans, which needs one new Stripe price.
2. **Current monthly allowance:** today every subscriber can request 4 or 15 cards per month without Card Club. Should non-members lose that and pay for reprints (existing customers kept as they are), or keep it?
3. **Trial:** should Card Club charges also wait until the 14-day trial ends?
4. **Reprint price:** is there an approved price? If not, it stays configurable and blank.

Nothing will be published and no customer records will be changed without your approval. Testing will use only test-mode or fixture data.
