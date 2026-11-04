# Optional subscription invitations — review handoff

## Current-account compatibility correction — 2026-11-04 UTC
- Preserve earlier isolated OTP-client fix and validated signup/magiclink types. Permit opposite-kind ownership only when checkout resolves the exact existing real bound owner; unowned/demo incompatible claims still fail closed.
- Applied `0039_invitation_existing_owner_compatibility.sql` with the supported migration tool; matching `20261104000100_invitation_existing_owner_compatibility.sql` twin. Replaces only the association function's cross-kind condition; unchanged service-only execution. Read-only verification confirms the new condition, authenticated execution false, service execution true, zero invitations. No owner/profile data changes.
- Access response supplies a server-derived exact dashboardPath only after rechecking invited hub ownership. Personal uses `type=lite&profile_id`; restaurant uses `type=restaurant&restaurant_id`. Normal owner-filtered queries choose the exact requested row; foreign/unknown IDs show unavailable, not a different hub. No customer impersonation parameters.
- Dialog mint/revoke results ignore changed/closed targets and superseded requests, including errors/finalizers. Removed unsupported permanent “Shipping pending” text; existing shipping address and card quantities remain.
- `QA_MODULES=/tmp/invitation-qa/node_modules bun run test:release`: PASS 25 suites, including 25 invitation checks and 14 isolated PostgreSQL checks. Existing dual-kind bound owners, multiple hubs, exact paths, incompatible unowned/demo claims, real pinned SDK isolation and old links pass. Isolated owner RLS uses production-read owner SELECT predicates; foreign rows invisible, browser association execution denied.
- `python3 scripts/check-subscription-invitation-browser.py`: PASS 320/360/390/1280 widths, including deliberately delayed mint/revoke while closing and switching hubs. `python3 scripts/check-subscription-invitation-dashboard.py`: PASS exact personal/restaurant target among multiple owned hubs and foreign-ID unavailable states; all external requests intercepted.
- `bun run security:source`: PASS 1183 sources; `bun run security:test`: PASS 11. Automatic preview build OK; manual production build/typecheck not run.
- Supported redeployment succeeded for `subscription-invitation` and shared-helper dependent `payment-first-webhook`. Submitted source SHA-256: `7a1fadfb64134e1c5a06dcd471012d9caaa43ccecf3e7dfca38358deca327502` and `98332a1bee524c33a285cc96209472d9f2da280aeb290453639ce7cc3d5733ea`.
- Focused files: shared invitation helper, association SQL/generated metadata/twin, invitation page, Dashboard, PersonalDashboard, invitation dialog/card panel, two existing invitation regression scripts, new dashboard browser regression, AGENTS.md/roadmap/this note. No publication, real emails/purchases/identities/customer mutations. Hosted real payment/email/login remains UNVERIFIED by restriction; exact-commit production CI remains required.

## Focused access correction — 2026-11-03
- Baseline: `61ac0a348d3716f0c762aae7281f18beb743a98b`; its previously reported production CI is not claimed for this correction.
- `redeemAccess` now verifies OTP on a separate publishable client with persistence, refresh and URL detection disabled. The privileged database client never signs in; RPC execution permissions are unchanged. No schema migration.
- Store only validated returned `magiclink`/`signup` verification type with the existing auth hash. Redeem that exact type; reject other types. Previously issued unprefixed magiclink hashes retain their original behavior.
- Real pinned SDK 2.39.7, intercepted fetch: both existing-user magiclink and newly generated-user signup responses pass generation → verification → association. OTP installs the session only on the auth client; association carries the service API key and service bearer, while the service client has no user session. A negative control reproduces the old bearer replacement with `persistSession:false`. No external SDK traffic.
- `QA_MODULES=/tmp/invitation-qa/node_modules bun run test:release`: PASS, 25 suites; includes 22 invitation checks and 11 isolated invitation PostgreSQL checks. Old-link compatibility and unsupported generated token-type rejection pass.
- `bun run security:source`: PASS, 1179 source files. `bun run security:test`: PASS, 11 checks. Latest automatic preview compilation: build OK; no manual app production build/typecheck.
- Supported deployment succeeded for `subscription-invitation` and `payment-first-webhook`; the latter also generates invitation access links through the changed shared helper. Submitted source SHA-256: `c470c5a3ae23edb93d4e5d59d1923f7a5eacc49181cb2d8205e50ab3e466a001` / `254551969c1330e1b9be952369c74d5d2915777b9b40aefed376d70dfb989de0` respectively. No other backend redeployments.
- Focused files: shared invitation helper, invitation regression, isolated harness SDK-injection hook, AGENTS.md, roadmap.md and this note. No frontend changes/publication, real emails, purchases, identities or customer mutations. Hosted real login remains UNVERIFIED under those restrictions; new-commit production CI remains the review step.

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