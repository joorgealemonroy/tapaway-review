# TapAway storefront and commerce review

Updated October 20, 2026 on `codex/storefront-conversion`, incorporating Lovable updates through `56bd1c337e190843f24200da240ec6af6a3df497`. Review in [draft PR #1](https://github.com/joorgealemonroy/tapaway-review/pull/1).

This is source prepared for review. No production deployment, migration, Stripe product creation, live charge, customer update, or real email send was performed.

## Customer experience

| Area | Result |
| --- | --- |
| Try the Experience | Real Tutti Mangia, Sugar Bloom, Space Studios, Reborn Wraps, Julian, and Denzel hubs, with external-open links. Responsive iPhone 16 body proportions and a scaled 393 × 852 viewport. |
| Testimonials | Existing quotes paired with their existing customer portraits. No invented reviews or ratings. |
| Personal offer | $39 once for two independently designed NFC + QR cards; free US shipping; no personal trial or Card Club. Optional hosted hub and analytics are $5/month, unchecked by default. |
| Personal gallery | Existing Julian/Denzel card art reused where available. Crossfading photo slots are ready for new owner-supplied photographs; illustrative fallbacks are labeled. |
| Halloween | October 2026 banner and card template; banner ends November 1. No fabricated discount or countdown. |
| Business purchase | Monthly first, yearly savings badge, verified 4/15-card offers, required business name/city, optional existing link, and a goal choice before payment. |
| Card Club | One unchecked business add-on in the same checkout and subscription: +$5/month or +$60/year, matching the base plan. Existing legacy memberships retain their billing model. |
| Help | Readable support page, AI answers capped at five questions per visitor per UTC day, and immediate team-message handoff with transcript. The team replies by email; this is not presented as staffed live chat. |

Public temporary $1-verification-hold copy has been removed. Stripe verification behavior remains unchanged; actual renewal and optional hosting charges remain visible.

## Review in Lovable

Use the connected project's preview with `codex/storefront-conversion` selected. Do not publish while reviewing.

- `/`: product explanation, six real hubs, portraits, monthly pricing, and help widget.
- `/personal`: $39 pair, optional hosting, templates, real personal hubs, and Halloween banner.
- `/personal/design`: customize both sides of both cards, review all four, download PDF, and purchase.
- `/start?plan=solo&billing=month`: short business intake; try yearly and Card Club too.
- `/support`: readable answers and email question form.
- `/dashboard`: business Cards tab uses the actual included membership; personal hosting shows the one-time card path and $5/month billing.
- `/admin/personal-card-orders`: admin-only paid artwork/fulfillment queue.

**UI preview does not deploy the new backend.** Before setup, personal checkout may show unavailable and AI offers email fallback. A business catalog without `checkoutVersion: 2` cannot enable the new checkout, preventing combined-billing promises against the old separate-Club backend.

## Personal designer and order

Templates cover networking, personal, Halloween, and a blank canvas. Customers can add text/images, drag or numerically position elements, change fonts/colors/sizes, reorder/delete layers, undo, copy a side to the second card, and give each card a different destination. IndexedDB retains local drafts and images for retry; a local save does not place an order.

Review shows all four sides and requires artwork approval. Images normalize orientation to PNG; resolution below 150 effective dpi blocks printing, while 150–299 dpi produces a warning against the 300 dpi target. Safe margins and the QR quiet zone are enforced; tiny text and QR overlap produce review warnings. Staff still review the paid artwork.

Checkout contains either the $39 pair alone (`payment` mode), or that pair plus optional hosting (`subscription` mode: $44 initially, then $5/month). No personal trial. Stripe collects email and US shipping address without a separate account-creation step first. Hosted customers use the existing secure dashboard-access flow.

The server verifies price amount, currency, activity, recurrence, and Stripe mode; stores private PDFs and source designs; preserves immutable artwork revisions; reuses retry sessions; and expires an old checkout before replacing artwork. A secret local draft token protects order edits. PDF import discards interactive annotations, forms, and document actions. Staff approval is required: dimension checks alone cannot establish that arbitrary uploaded art matches the source manifest.

Paid hosting creates a server-assigned personal profile and submitted links. Test profiles remain unapproved and nonpublic. Printed hosted URLs use `/connect/<order-id>` and resolve only to paid, live, active, approved profiles; a username change does not break that URL. Ending hosting disables the hosted destination. Cards pointing directly to external URLs do not require a TapAway subscription.

## Business follow-through

The brief is stored with the checkout intent, seeds the existing onboarding draft, and is visible in the admin new-order screen. Customers can skip an optional logo and finish shipping after payment. The team can build from the submitted business name, city, link, and goal; this does not claim instant automated research or fulfillment.

New Club memberships bind to the Club line item within the main subscription. Eligibility remains controlled by the existing server entitlement function, after a positive paid Club invoice line and its waiting period. Trial invoices and base-plan-only payments cannot start eligibility. Removing Club cannot cancel the base subscription. Dashboard requests are scoped to the selected profile and membership. Existing pooled free-card economics remain intact.

## Backend setup before activation

These are instructions for a later approved deployment, not actions performed by this PR. Keep public checkout gated during deployed-preview validation with Stripe test mode and the existing private test key.

1. Apply `supabase/migrations/20261020090000_storefront_orders.sql` after existing migrations. It adds the business brief, atomic support quotas, private personal orders/artwork, and stable public-card lookup. A restrictive storage policy prevents existing broad policies from exposing this bucket.
2. Configure mode-specific personal Stripe prices. The cards product represents **two physical cards**, quantity one; the recurring product is hosting only.

   | Secret | Required Stripe price |
   | --- | --- |
   | `PERSONAL_CARDS_PRICE_ID_TEST` / `PERSONAL_CARDS_PRICE_ID_LIVE` | Active USD 3900 one-time price |
   | `PERSONAL_HUB_PRICE_ID_TEST` / `PERSONAL_HUB_PRICE_ID_LIVE` | Active USD 500 monthly price, interval count 1 |

3. Retain the existing verified business catalog and Club product. Yearly Club adds a $60 yearly line on that product. Configure Stripe's customer portal for the intended products/cancellation behavior.
4. Deploy new functions: `personal-card-catalog`, `personal-card-order`, `personal-card-admin`, and `storefront-support`.
5. Deploy changed functions/shared dependencies together: `onboarding-plan-catalog`, `payment-first-checkout`, `payment-first-onboarding`, `payment-first-webhook`, `stripe-webhook`, `card-club-request`, `create-card-order`, and `manage-personal-subscription`. Follow `supabase/config.toml`; the admin endpoint validates JWT and admin role internally.
6. Retain Stripe test/live secret keys and signing secrets. Payment-first webhook events: checkout completion, invoice paid/payment failed, subscription updated/deleted, charge refunded, dispute created. Signature/mode verification and `pf:<event-id>` deduplication remain mandatory. Configure both existing webhook routes consistently; the legacy webhook skips the new personal commerce version.
7. Configure `LOVABLE_API_KEY` for the existing Lovable AI gateway, transactional email credentials, and `EMAIL_INTERNAL` (default `tap@tapaway.co`). Saved support requests are the inbox source of truth if notifications fail. AI runtime usage is separate from Lovable editor usage and is not promised to be free.
8. Keep `PAYMENT_FIRST_STRIPE_MODE=test` and existing payment-first switches/private-key restrictions for review. New personal purchases additionally need `PERSONAL_CARDS_ENABLED=true`, except the private-key test path. The frontend switch remains `PAYMENT_FIRST_DEFAULT`; no remote switch was changed here.
9. Exercise deployed test-mode personal orders with/without hosting; business intervals with/without Club; cancellation/retry; webhook retries; hosting cancellation; team handoff; admin downloads; and the portal. Verify email delivery, shipping promises, and a physical test card before live activation.

Initial-purchase refunds/disputes hold production for review; a later $5 hosting renewal refund does not mark the original physical-card order refunded. Staff resolve held orders. Purchase emails are transactional; billing and support requests never imply marketing consent.

## AI knowledge and limits

Update `supabase/functions/_shared/storefrontKnowledge.ts` for shared FAQs and reviewed AI knowledge, then redeploy `storefront-support`. The function adds current verified business prices with a two-minute cache; unavailable prices must not be guessed. The model receives no account credentials, customer records, or write tools.

The database enforces five AI attempts per visitor per UTC day, plus 20/day per network to discourage clearing local storage. Team messages have a separate five/day network limit with direct email fallback. Failed model calls consume an attempt. Daily salted hashes avoid raw IP storage. These limits deter abuse; they are not identity verification. AI is labeled and human handoff remains available.

## Evolis print workflow

The PDF has four pages: **card 1 front, card 1 back, card 2 front, card 2 back**. Every page is exactly **85.6 × 53.98 mm (CR80)** without crop marks or preview guides. Print at **100% / actual size**, not fit-to-page. Art reaches the page edge; essential content stays within a 3 mm safe area.

Images target 300 effective dpi, approximately 1011 × 638 pixels for a full card. Text uses the browser's matching font and renders at 600 dpi to preserve Unicode and editor appearance. QR modules are vector black with a white quiet zone. Raster text may require Evolis driver black-extraction settings; a PDF cannot force K-panel or overlay behavior.

The stated ribbon is **R5F208A100**. Evolis' [compatibility chart](https://downloads.evolis.com/evolis/documents/consumables-compatibility-chart.pdf) lists the **R5F208 family for Primacy 2**, not original Primacy. Confirm the installed model and ribbon in Evolis Print Center before production. The [Primacy 2 specification](https://us.evolis.com/wp-content/uploads/2021/12/Specsheet-Primacy2-ENG.pdf) supports the CR80/300-dpi target.

YMCKO supplies color, black, and protective overlay; two-sided color printing uses a panel set per side. Select correct ribbon/card type, duplex/manual-flip orientation, overlay, and black extraction. Print a sample on the actual NFC stock; check color, small text, edges, front/back orientation, QR scans, and NFC. Screen previews cannot guarantee exact dye-sublimation color matching.

In the admin queue, download the PDF/source, verify destinations, approve, print, **encode/test NFC separately**, then mark printed. Shipping requires carrier/tracking. Test orders are visibly labeled and must not be fulfilled. PDF export neither configures the printer nor programs NFC.

## Replace product photos

Add approved photos to `public/personal-cards/` or the existing asset store and fill `src/data/personalCardPhotos.ts` with `src`, `alt`, and `caption` entries. The gallery handles transitions and layout without changes to checkout/templates. New card photos were not supplied; existing testimonial portraits were reused, not generated.

## Verification

- Production Vite build and frontend TypeScript checks pass.
- Changed/new payment, personal-commerce, and support functions type-check against matching Stripe 14.21.0 / Supabase 2.39.7 npm definitions. Direct Deno remote-module resolution was unavailable; deployed Edge-runtime validation remains necessary.
- Browser fixtures cover catalog gating, all four business prices/intervals, required intake, Club totals and dashboard scope, personal hosting, designer/PDF checkout, mobile widths, hubs/portraits, AI cap/handoff, and error recovery. All external customer/payment/email/analytics traffic is mocked or blocked.
- Isolated commerce checks exercise actual handlers with mocked services: Stripe signature/mode verification, pricing, immutable retries, profile identity isolation, included Club billing/eligibility, quotas, admin authorization, and refunds.
- The migration runs in isolated PostgreSQL (PGlite). Checks cover concurrent five-question limits, denied public order/artwork access, username redirects, canceled hosting, and test/live isolation.
- A four-page PDF was dimension checked, rendered and visually reviewed, and both QR destinations decoded correctly. No physical printer was available.

```sh
npm run build
npx tsc --noEmit -p tsconfig.app.json
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-storefront.cjs
QA_MODULES=/path/to/qa/node_modules node scripts/check-personal-commerce.cjs
QA_MODULES=/path/to/qa/node_modules node scripts/check-storefront-database.cjs
```

Separate QA dependencies: Playwright/Chromium, Stripe 14.21.0, and `@electric-sql/pglite`. Optional `BROWSER_EXECUTABLE`, `BROWSER_ARGS` (JSON), `QA_ASSETS`, and `QA_SCREENSHOTS` configure browser checks. App additions are `pdf-lib`, `qrcode`, and QR typings; the lockfile also reconciles previously declared Lovable dependencies.

Real Stripe checkout pages, provider AI responses, email delivery, and physical fulfillment are not proven by isolated fixtures. Conversion gains and sales growth need measurement after release.
