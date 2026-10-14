# Project rules

- Share the verified onboarding catalog client between public pricing and signup; unavailable or missing prices cannot enable checkout actions because Stripe is authoritative.
- Keep public quantity labels separate from internal plan identifiers and grandfathered economics to preserve existing subscriptions.
- Optional advertising must check current explicit consent at every send; server reporting stays blocked until durable, revocable server-side evidence is available, so billing never implies consent.
- Completion passes prepare source changes and nontransactional tests only unless deployment or customer mutations are explicitly authorized.