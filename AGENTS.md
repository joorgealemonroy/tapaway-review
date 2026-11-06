# Project rules

- Rep draft previews require an explicit preview route, an active rep and a caller-scoped assigned draft under RLS. Keep them out of public caches and analytics; null billing plans must never rewrite stored hub addresses.

- Analytics reports use one canonical SQL snapshot over validated, human-classified analytics_hits, half-open bounds and kind+hub ownership; never fall back to legacy counts or infer people/outcomes. This keeps private reports and exports reconcilable.

- Invitation dashboard targets are server-derived after association and selected from authenticated owner-scoped rows; existing real same-owner dual-kind hubs are preserved, while new incompatible claims remain blocked.

- OTP redemption uses a separate nonpersistent publishable auth client; retain validated signup/magiclink type with the stored hash and never install a user session on a privileged database client.

- Optional existing-hub invitations use a distinct versioned checkout and atomic owner-bound fulfillment; mandatory gates and legacy claim tokens remain unchanged to preserve public access and issued contracts.

- The Las Islas original-PDF menu link is allowlisted by exact restaurant ID; other hubs retain their existing menu RPC and viewer so legacy destinations cannot inherit location-specific UI.

- Public hub resolution and profile fetch results belong to the current route/request only; remount route destinations and discard superseded async results so loading never exposes another hub or a premature missing gate.

- Share the verified onboarding catalog client between public pricing and signup; unavailable or missing prices cannot enable checkout actions because Stripe is authoritative.
- Keep versioned bucket constraints in supabase/storage-buckets.json and apply them through supported Storage administration, never migration SQL; isolated fixtures load this configuration separately to avoid claiming migrations configure storage.
- Keep public quantity labels separate from internal plan identifiers and grandfathered economics to preserve existing subscriptions.
- Optional advertising must check current explicit consent at every send; server reporting stays blocked until durable, revocable server-side evidence is available, so billing never implies consent.
- Completion passes prepare source changes and nontransactional tests only unless deployment or customer mutations are explicitly authorized.- Payment-first onboarding stays behind three switches (frontend PAYMENT_FIRST_DEFAULT, backend PAYMENT_FIRST_ENABLED, PAYMENT_FIRST_STRIPE_MODE); before go-live only requests with the private test key may start checkout, so ordinary traffic cannot hit it.
- Payment-first orders are represented by an unapproved draft personal_profiles row (Solo/Pro model), not fulfillment_orders, which is restaurant-only; the print queue is reached only via artwork upload.
- payment-first-webhook verifies signature, then event livemode vs mode, and claims events as `pf:<id>` so it never collides with the legacy stripe-webhook in processed_stripe_events.
- Card Club eligibility lives only in card_club_entitlement(): first = first paid invoice + interval, next = last admin approval + interval; one pending request at a time.
- Legacy free monthly cards are reserved only via reserve_legacy_allowance() (row lock per legacy_allowance_key, one pool per paid subscription, never per page); accounts without paid Stripe billing never qualify, so pages cannot multiply the benefit.
