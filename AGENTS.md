# Project rules

- Share the verified onboarding catalog client between public pricing and signup; unavailable or missing prices cannot enable checkout actions because Stripe is authoritative.
- Keep public quantity labels separate from internal plan identifiers and grandfathered economics to preserve existing subscriptions.
- Optional advertising must check current explicit consent at every send; server reporting stays blocked until durable, revocable server-side evidence is available, so billing never implies consent.
- Completion passes prepare source changes and nontransactional tests only unless deployment or customer mutations are explicitly authorized.- Payment-first onboarding stays behind three switches (frontend PAYMENT_FIRST_DEFAULT, backend PAYMENT_FIRST_ENABLED, PAYMENT_FIRST_STRIPE_MODE); before go-live only requests with the private test key may start checkout, so ordinary traffic cannot hit it.
- Payment-first orders are represented by an unapproved draft personal_profiles row (Solo/Pro model), not fulfillment_orders, which is restaurant-only; the print queue is reached only via artwork upload.
- payment-first-webhook verifies signature, then event livemode vs mode, and claims events as `pf:<id>` so it never collides with the legacy stripe-webhook in processed_stripe_events.
- Card Club eligibility lives only in card_club_entitlement(): first = first paid invoice + interval, next = last admin approval + interval; one pending request at a time.
