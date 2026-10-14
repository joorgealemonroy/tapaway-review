# TapAway completion review

Prepared for source review only. No production publish, function deployment, migration, customer mutation, payment, signup, support submission, email, or SMS was performed.

Preview: https://id-preview--db97f54f-4c1d-4910-ae17-ca4c23111c49.lovable.app

Verified source snapshot before this report: `163632eea33f8eabb8d26f7234342d7ec88df920`. Repository commits are managed automatically; this report itself may appear in a later commit.

## Changes

- Shared verified catalog loading and five-minute session caching in `src/lib/onboardingCatalog.ts`. Homepage and onboarding use the same amounts. Missing/unavailable combinations disable continuation; retry and monthly alternatives are offered without exposing configuration errors.
- Added `PricingSection.tsx` and `HowItWorksSection.tsx`, plus shared marketing links. Annual totals are prominent; equivalents explicitly state yearly billing. Verified live amounts are 4 cards $20/month or $199/year and 15 cards $39/month or $390/year. Calculated annual savings are $41 and $78.
- `Onboarding.tsx` reads and immediately persists explicit plan/cycle parameters, retains saved selections, removes hardcoded display-price fallbacks, adds associated field labels, provider-specific actions, readable recurring terms, and saves typed details immediately on step navigation. Backend identifiers, entitlements, Stripe IDs, trials, and subscription prices are unchanged.
- Homepage navigation, hero example link, footer CTA, footer, dashboard example action, FAQ, and comparison copy now use consistent theme surfaces and qualified language. The card/phone showcase implementation and its admin management were not altered.
- Sample dashboard metrics are labeled illustrative. View links to the existing `/examples` route; sample tabs remain noninteractive illustrations. Examples fallback layouts explicitly identify themselves as illustrative; unsupported review-uplift claims were removed.
- Consent banner/settings, consent store, Meta event guard, Trybe visitor-ID guard, and first-party returning-visitor consent wiring were updated. Visitors can decline after acceptance. Meta receives its supported revoke command; an already-loaded Trybe SDK is stopped by persisting denial and reloading. Unknown or blocked storage fails closed. Reacceptance works. Choice records include timestamp, notice version/text, and a visitor-specific reference. Existing legacy acceptance is not silently reused for a changed notice.
- `advertisingConsent.ts`, `metaCapi.ts`, and `trybeOrders.ts` fail closed for server advertising. No current, revocable server consent record exists in this architecture. Checkout information or old Stripe visitor metadata is not treated as consent. Billing and fulfillment do not depend on optional reporting. `verify-personal-checkout` no longer provides a second paid Purchase path; the existing positive-invoice emitter remains the only paid path, currently suppressed by the consent gate.
- Privacy, Cookie Policy, and the narrow tracking-consent paragraph in Terms describe the implemented behavior without claiming blanket legal compliance. Existing unrelated commercial terms and SMS disclosures are retained.
- `create-checkout-session` adds supported Stripe `custom_text.submit` recurring/hold/policy disclosures without changing line items or trial settings. This source change has not been deployed or transactionally verified.
- Base HTML and homepage metadata now describe the business offer. Static product-offer JSON-LD was removed to avoid contradicting live catalog availability. Public personal-hub title/H1 falls back to username when the name is empty; loaded restaurant hubs receive route metadata and an H1 fallback. Ownership and demo/status logic were left unchanged.

## Actual checks

Browser checks used the running local app at http://localhost:8080 with anonymous sessions, read-only live catalog responses, browser-only state, and isolated fixtures. Scripts/screenshots remain under `/tmp/browser/completion/`.

- Live catalog endpoint returned HTTP 200: all four exact combinations available at the amounts above, USD, 14-day trial.
- Homepage and onboarding checked at 360, 390, 430, 768, and 1280 pixels: no horizontal overflow and no JavaScript page errors. Pricing and onboarding screenshots were visually inspected.
- All four homepage pricing CTAs carried the expected `solo`/`venue` and `month`/`year`, persisted immediately, and displayed the matching amount in onboarding.
- Referral/campaign/card/promo query preservation checked using inert browser fixture strings; no transactional action was submitted.
- Plan back navigation, filled manual business name/phone, remembered manual-entry mode, refresh selection, and email/password labels passed. No OAuth action or account creation was performed.
- `/examples` and `/support` loaded with meaningful headings and no mobile horizontal overflow. Privacy and Cookie Policy headings were checked and their route metadata subsequently added.
- Missing-yearly fixture: homepage and onboarding yearly Continue disabled, monthly alternative enabled; passed.
- Consent fixture checks: no vendor requests pending; one Meta init and one initial PageView after accept; an additional PageView on SPA example navigation; revoke reload removed SDKs; revoked Trybe ID empty; no new Meta event after revoke; reaccept initialized once; blocked storage stayed declined. No page errors. Vendor scripts were stubbed for event assertions, not claimed as vendor delivery tests.
- Focused ESLint on the new/shared catalog, consent UI/store, navigation, homepage, and policy files passed. `git diff --check` passed.
- Broader touched-file lint still reports existing `any`, empty-catch, and hook-dependency findings in Onboarding, GooglePlacesAutocomplete, and ReviewHub. These unrelated issues were not broadly refactored.
- Build/typecheck is performed by the project harness, not manually run. A separate successful full build/typecheck result is not claimed in this report.

## Source-only billing/security inspection

- Existing exact Stripe price mappings remain unchanged. Catalog validation checks price active/recurring, product active/metadata identity, USD, amount, and month/year interval. Checkout calls its resolver with cache bypass to revalidate the selected price.
- Trial checkout retains `trial_period_days`. Activation verifies actual Stripe subscription state and runs the service-role-only card verifier. Verification failures cancel the trial instead of presenting success.
- The $1 verification intent uses manual capture and requests cancellation. Cancellation can fail; bank hold release timing is not instantaneous. Customer copy no longer promises instant bank release.
- Webhook signature verification and `processed_stripe_events` replay handling remain unchanged. Positive invoices alone enter paid reporting; $0 invoices do not. Existing first-paid conversion versus renewal analytics remains intact.
- Public profile reads use curated RPC/view data rather than anonymous base-table access. Existing owner/admin policies and claim handoff were not changed or exercised transactionally.
- Current card request authority is 4/15 per calendar month, counting orders since server month-start for eligible active/trialing accounts. Existing plan-family classification, including grandfathered mappings, was not modified. Refund exception remains shipping damage or defective NFC reported within 7 days, not unlimited free replacements.

## Remaining blockers and caveats

1. Server consent persistence is absent. A durable visitor/account notice record with a reliable withdrawal lookup needs an explicitly approved design and migration before Meta CAPI/Trybe order reporting can be enabled responsibly. Browser checkout metadata alone cannot satisfy delayed-event revocation. No schema was invented or production migration run. The source gate suppresses optional server reporting, including creator attribution, pending that work.
2. These backend consent/disclosure changes are source-only. Production functions still use their currently deployed behavior until a separately approved deployment. This pass does not assert that production server tracking is already fixed.
3. `/muchasgraciasmexicanfood` now renders a nonempty username title/H1. Its existing demo notice remains. Current verified customer billing/claim status was not established in this pass, so no status or record was changed. The public hub also has pre-existing mobile horizontal overflow observed at 390 pixels; not fixed by bulk-changing customer hub styling/content.
4. Local preview's supplied phone-frame asset does not decode correctly and shows a broken-frame indicator. The card and live hub content render, but the existing authoritative frame asset/pointer was deliberately not replaced. Asset delivery needs verification in the hosted preview before production approval.
5. Full payment, cancellation, OAuth restoration, authenticated editor/admin boundaries, shipment/fulfillment, customer messages, and refunds were not end-to-end tested. No test credentials or transactions were invented. Hosted Stripe card-entry ordering of the supported custom disclosure cannot be proven without an approved test-mode checkout fixture; the pre-checkout screen includes the hold explanation before payment collection.
6. Acquisition analytics detects an existing first-paid record before labeling renewals; if a prior analytics insert fails, a later invoice could be misclassified. Concurrent separate invoice processing is not protected by a per-subscription acquisition constraint. These source-inspected reporting gaps are not a claim of successful transactional replay testing.
7. Public read/admin-only setting write policies were inspected in source; no production permission mutation probes were performed. The existing setting/default service is reused.
8. Confirm the harness build/typecheck result and review all source/backend changes before separately authorizing publication/deployment.
