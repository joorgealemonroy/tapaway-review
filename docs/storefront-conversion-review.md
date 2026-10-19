# TapAway storefront and purchase-flow review

Prepared October 19, 2026 against `00238c0fc10a4455f5651e42826827e290150d83`.

## Goal and approach

Make TapAway easier to understand, buy and get help with, using the supplied visual reference and the products and systems already in the repository. The design uses a light storefront, a product-led hero, business/personal panels, an interactive hub example, clear plan choices and accessible support. The hero artwork and customer quotes come from existing TapAway assets/components. Illustrative cards and hub examples are labeled; no invented review totals or conversion gains are presented as evidence.

The positioning emphasizes custom cards plus a hub the team sets up, using the customer's existing menu, booking and social destinations. Official pages reviewed for market context: [Popl](https://popl.co), [Mobilo](https://mobilocard.com), [V1CE](https://v1ce.co), and [Tap Tag](https://taptag.shop). These cover lead capture, team cards and self-service review cards; this is a representative benchmark, not an exhaustive market ranking. No competitor price comparisons or superiority guarantees are published.

## Customer journeys

| Starting point | Next steps | Existing system retained |
| --- | --- | --- |
| Business landing page | Choose 4 or 15 cards and monthly/yearly billing → review order → Stripe checkout | Verified onboarding catalog and payment-first checkout function |
| Personal landing page | Choose the existing 4-card subscription → review order → Stripe checkout | Same existing plan and fulfillment model; no new one-time SKU |
| Checkout canceled | Restore Stripe's `cycle` and quantity plus the locally chosen Card Club preference → retry | Existing Stripe cancel URL and onboarding state |
| Checkout completed | Confirm account access → business/name details → optional logo → shipping → dashboard | Existing welcome, onboarding, authentication and fulfillment endpoints |
| Question before purchase | Quick answers → public question form or email | Existing support request and notification backend |
| Existing customer's card question | Dashboard card options and eligibility | Existing server-enforced Card Club and legacy benefits |

The standard public order screen replaces the additional Card Club step with an unchecked optional checkbox. Full annual totals, renewal timing, trial conditions and the possible temporary verification hold are visible. Checkout remains disabled when the verified catalog cannot supply an available price. Slow settings responses cannot overwrite an explicit billing choice. Card Club choices are saved at checkout so cancellation restores the choice actually submitted.

Classic, representative and promotional onboarding branches remain available. The payment-first feature switches, Stripe products, webhook activation, customer data schemas, draft-profile model and artwork approval gates are unchanged. Public labels remain 4/15 cards; internal `solo`/`venue` identifiers are retained.

## After-checkout and help behavior

- Transport errors and incomplete confirmation lead to a retry/support screen; they do not claim payment succeeded or ask an already-paying customer to order again.
- Setup saves preserve entered fields when a request fails.
- Sign-in email failures remain retryable instead of showing a false sent state.
- Personal visitors can enter a name/brand without a Google business listing. The same manual option remains available if local audience state is absent, such as on a different device.
- Shared FAQ content aligns the homepage, help page and FAQ page. Support links no longer use conflicting call-to-action labels.
- Existing analytics events and consent handling remain in use. `purchase_completed` is no longer emitted for the unconfirmed `processing` state. Optional advertising still depends on explicit consent.

## Validation

- Production Vite build passes.
- Focused ESLint checks pass for the new components and changed storefront/support/welcome modules.
- `scripts/check-storefront.cjs` supplies browser fixtures for all backend calls and blocks other external requests. It covers all four plan/interval combinations, default and selected Card Club, cancellation, checkout failure/retry, missing/unavailable catalog prices, personal routing, interactive examples, mobile menu, question-form recovery, access-email recovery, welcome recovery, and personal setup through shipping.
- Responsive checks cover 360, 390, 768 and 1440 px on the homepage, personal page, order screen, support, examples and FAQ. Desktop and mobile screenshots are visually inspected.
- Full TypeScript checking has six pre-existing Supabase typing errors in admin/dashboard/legacy-signup modules. Compare with the same base commit and installed dependencies; these errors are not introduced by this change.
- The existing lockfile does not match `package.json`, so `npm ci` fails on the base as well. Dependencies were installed with `npm install --package-lock=false --no-audit --no-fund`; this change does not modify dependency declarations or lockfiles.

### Run the browser checks

Install Playwright outside the repository or use an existing installation with Chromium:

```sh
npm install --prefix /tmp/tapaway-browser-tools playwright
node /tmp/tapaway-browser-tools/node_modules/playwright/cli.js install chromium
PLAYWRIGHT_MODULE=/tmp/tapaway-browser-tools/node_modules/playwright node scripts/check-storefront.cjs
```

The script starts the local Vite server itself and uses the project's public production environment configuration only to identify and intercept the backend origin. Optional `BROWSER_EXECUTABLE`, `BROWSER_ARGS` (a JSON array), and `QA_SCREENSHOTS` configure the local browser. No live checkout, support email, account activation or customer update is performed by these tests.

## Release limits and measurement

This is a source-review change, in accordance with `AGENTS.md`. No deployment, live charge, customer mutation or real email send is part of this pass. The Stripe-hosted payment form, actual email delivery and real fulfillment are not proven by fixture tests. Before an authorized launch, exercise the deployed preview with approved Stripe test configuration and confirm the operational shipping/design promises with the team.

The new personal offer deliberately uses the existing 4-card subscription. A one-card, one-time purchase needs its own approved product economics and backend fulfillment work; this page does not pretend that product exists.

After launch, compare the existing funnel events for landing CTA → checkout clicked → Stripe checkout started → confirmed checkout → completed setup, segmented by device and acquisition source. Review qualified support questions and abandonment points. This release creates a measurable conversion foundation; increased traffic, sales and market leadership require observed results and continued acquisition work.
