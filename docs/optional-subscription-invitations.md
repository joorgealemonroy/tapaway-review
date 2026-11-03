# Optional subscription invitations — review handoff

## Admin click path
Admin → Hubs & accounts → eligible free active business → Payment link → confirm Dashboard email → Generate payment link → scan QR / Copy link / native Share (where supported).

Require payment remains separate and unchanged. Real bound owners use their existing account email. An admin may replace a demo-placeholder intended email; association occurs only after the intended email is verified. Existing real owners cannot be reassigned from payer email.

## Focused source changes
- `src/components/admin/AdminHubs.tsx`
- `src/components/admin/AdminUnifiedAccountsTable.tsx`
- `src/components/admin/SubscriptionInvitationDialog.tsx`
- `src/pages/SubscriptionInvitationPage.tsx`
- `src/App.tsx`
- `src/components/dashboard/SubscriptionInvitationCards.tsx`
- `src/components/personal/CardsTab.tsx`
- `src/pages/Dashboard.tsx`
- `shared/subscriptionInvitation.ts`
- `supabase/functions/_shared/subscriptionInvitationRules.ts` (credential-free deployment copy of shared rules)
- `supabase/functions/_shared/subscriptionInvitation.ts`
- `supabase/functions/subscription-invitation/index.ts`
- `supabase/functions/payment-first-webhook/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/card-club-request/index.ts`
- `drizzle/migrations/0037_optional_subscription_invitations.sql`
- `drizzle/migrations/0038_optional_subscription_lifecycle_guards.sql`
- Corresponding generated Drizzle journal/snapshots and regenerated `src/integrations/supabase/types.ts`.
- `supabase/migrations/20261103233900_optional_subscription_invitations.sql`
- `supabase/migrations/20261103234400_optional_subscription_lifecycle_guards.sql`
- `scripts/check-subscription-invitation.cjs`
- `scripts/check-subscription-invitation-db.cjs`
- `scripts/check-subscription-invitation-browser.py`
- `scripts/check-personal-commerce.cjs` (isolated CORS import support)
- `scripts/check-release-regressions.cjs`
- `AGENTS.md`, `roadmap.md`, this handoff.

## Backend status
0037 and 0038 applied with the supported migration tool; generated types refreshed. Deployed exactly `subscription-invitation`, `payment-first-webhook`, `stripe-webhook`, `card-club-request`. Existing claim and mandatory gate endpoints were not changed. No frontend publication.

Initial cards reuse `personal_card_requests` for personal business hubs and `fulfillment_orders` for restaurant hubs; no duplicate profile or unapproved draft is created. Cards enter their existing pending queue after verified email association. Card Club uses the same subscription/item, paid-invoice anchor and existing entitlement RPC; invitation shipping is used for redemption. Durable reversal triggers hold unshipped invitation card rows.

## Actual validation
Run with `QA_MODULES=/tmp/invitation-qa/node_modules` (isolated pinned PGlite 0.5.12, Stripe 14.21.0, Svix 1.76.1 and client 2.39.7).

- `node scripts/check-subscription-invitation.cjs`: 17 checks PASS, including all eight plan/interval/Club choices, no trial, concurrent/replayed checkout, failed payment preservation, binding/spoofed success, email retry and one-use access.
- `node scripts/check-subscription-invitation-db.cjs`: 11 PostgreSQL checks PASS: grants/RLS, identity/content, real and placeholder owner association, idempotent cards, reversal-before-payment, durable legacy exclusion and held-card replay.
- `bun run test:release`: 25 offline suites PASS, including existing payment regressions.
- `bun run security:source`: PASS, 1178 source files scanned.
- `bun run security:test`: 11 checks PASS; fixture build only, not a manual app production build.
- `bunx eslint src/components/dashboard/SubscriptionInvitationCards.tsx src/components/admin/SubscriptionInvitationDialog.tsx src/pages/SubscriptionInvitationPage.tsx shared/subscriptionInvitation.ts`: PASS.
- `python3 scripts/check-subscription-invitation-browser.py`: PASS at 320×800, 360×800, 390×844 and 1280×1800; actual admin page with isolated signed-in fixture, QR/email controls, exact totals, failure/processing/paid/review states, access-link error and no overflow; all backend requests intercepted.
- Latest automatic preview compilation: build OK. Manual app build/typecheck not run; production GitHub CI remains required before publication.
- Hosted harmless smokes: invitation GET 405, unauthenticated mint 401, invalid token 409; both webhook missing-signature POSTs 400.
- Read-only preservation: 144 personal rows hash `8d91c8412ff76fb850594c4963f878f3`; 14 restaurant rows hash `e3aa7f7029a69a39d3d889d6b872ac82`, identical before/after. Invitations count zero; RLS enabled.

## Coverage boundary
No real checkout, customer charge, access email or auth identity was created. Hosted paid activation, delivery and login were therefore not exercised; only offline end-to-end equivalents and harmless hosted rejections were checked. Native Share availability depends on the customer's browser and was not exercised in headless Chromium. Source keeps the existing original menus/hub routes and their race fix untouched.