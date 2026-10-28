# TapAway storefront and commerce review

Updated October 21, 2026 on `codex/storefront-conversion`. Review in [draft PR #1](https://github.com/joorgealemonroy/tapaway-review/pull/1).

The owner explicitly approved production schema, permissions, and provider setup. The migration and backend functions are now deployed through the existing Lovable Cloud connection. Stripe live products/prices, the personal hosting billing portal, and webhook events are configured. The updated frontend has **not** been published. Personal purchasing remains disabled while paid end-to-end validation is outstanding. Existing live business mode and customer subscriptions were preserved.

## Customer experience

| Area | Result |
| --- | --- |
| Try the Experience | Real Tutti Mangia, Sugar Bloom, Space Studios, Reborn Wraps, Julian, and Denzel hubs, with external-open links. Responsive iPhone 16 body proportions and a scaled 393 × 852 viewport. |
| Testimonials | Existing quotes paired with their existing customer portraits. No invented reviews or ratings. |
| Personal offer | $39 once for two independently designed NFC + QR cards; free US shipping; no personal trial or Card Club. Optional hosted hub and analytics are $5/month, unchecked by default. |
| Personal gallery | Owner-supplied networking/meme cards appear on the homepage and the personal hero. Pink/yellow placeholder cards are removed. Optimized images load eagerly; the hero gets a high-priority preload. |
| Halloween | Owner-approved $39-for-two Halloween sale, a small dismissible top notice, and a fixed countdown ending November 1, 2026 at 00:00 Pacific (07:00 UTC). No invented original price, discount percentage, or resetting urgency; the sale label disappears after expiry. |
| Business purchase | Monthly first, yearly savings badge, verified 4/15-card offers, existing Google Place Finder first, with a “Business name, city, and state” manual fallback and a goal choice before payment. Selected listings supply address, place ID, locality, region, postal code, coordinates, website, and phone. |
| Card Club | One unchecked business add-on in the same checkout and subscription: +$5/month or +$60/year, matching the base plan. Existing legacy memberships retain their billing model. |
| Help | Readable support page with the same assistant and question suggestions, AI answers capped at five questions per visitor per UTC day, and immediate team-message handoff with transcript. The team replies by email; this is not presented as staffed live chat. |

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

**Backend deployment is separate from frontend publication.** The backend is deployed; personal checkout currently shows unavailable because its purchase switch remains off. AI is connected and the five-question limit has been exercised against the deployed function. A personal catalog without `designerVersion: 2` cannot enable portrait-aware checkout. A business catalog without `checkoutVersion: 2` cannot enable the new checkout, preventing combined-billing promises against the old separate-Club backend.

## Personal designer and order

Twenty templates cover networking, good energy, memes, Halloween, Thanksgiving, Christmas, and a blank canvas. Each card can be sideways or standing up. Untouched templates reflow into their orientation-specific layout; custom artwork fits without stretching. Customers can add text/images, drag and corner-resize elements including the QR, use center snapping and visual QR placement presets, change fonts/colors/sizes, reorder/delete layers, undo, copy a side to the second card, and give each card a different destination. Numeric measurements are under optional precise controls. IndexedDB retains local drafts and images for retry; a local save does not place an order.

Review shows all four sides and requires artwork approval. Images normalize orientation to PNG; resolution below 150 effective dpi blocks printing, while 150–299 dpi produces a warning against the 300 dpi target. Safe margins and the QR quiet zone are enforced; tiny text and QR overlap produce review warnings. Staff still review the paid artwork.

Checkout contains either the $39 pair alone (`payment` mode), or that pair plus optional hosting (`subscription` mode: $44 initially, then $5/month). No personal trial. Stripe collects email and US shipping address without a separate account-creation step first. Hosted customers use the existing secure dashboard-access flow.

The server verifies price amount, currency, activity, recurrence, and Stripe mode; stores private PDFs and source designs; preserves immutable artwork revisions; reuses retry sessions; and expires an old checkout before replacing artwork. A secret local draft token protects order edits. PDF import discards interactive annotations, forms, and document actions. Staff approval is required: dimension checks alone cannot establish that arbitrary uploaded art matches the source manifest.

The destination choice is explicit: use an existing Linktree, Linkme, social, or website address without an ongoing TapAway fee, or add a hosted TapAway page. Hosted checkout no longer asks for a hub name or links. Paid hosting creates a server-assigned personal profile using the purchase name; an empty set of links is valid. After payment, the existing dashboard guides the customer through an available `tapaway.co/yourname`, page design, and analytics. Hosted users can change their username through the existing availability check; stale availability responses cannot mark a newer name available. Hosted username changes do not rewrite other NFC cards owned by the account. Test profiles remain unapproved and nonpublic. Printed hosted URLs use `/connect/<order-id>` and resolve only to paid, live, active, approved profiles; a username change does not break that URL. Ending hosting disables the hosted destination. Cards pointing directly to external URLs do not require a TapAway subscription.

## Business follow-through

The selected Google listing or manual brief is stored with the checkout intent, seeds the existing onboarding draft, and is visible in the admin new-order screen. Customers can skip an optional logo and finish shipping after payment. The team can build from the submitted business name, city, link, and goal; this does not claim instant automated research or fulfillment.

New Club memberships bind to the Club line item within the main subscription. Eligibility remains controlled by the existing server entitlement function, after a positive paid Club invoice line and its waiting period. Trial invoices and base-plan-only payments cannot start eligibility. Removing Club cannot cancel the base subscription. Dashboard requests are scoped to the selected profile and membership. Existing pooled free-card economics remain intact.

## Approved production setup

- Applied and recorded `20261020090000_storefront_orders.sql`. Verified order-table RLS, denied anonymous order reads and user writes, service-only quota access, a private artwork bucket, and its restrictive policy. No existing customer rows were changed.
- Deployed 15 functions: `personal-card-catalog`, `personal-card-order`, `personal-card-admin`, `storefront-support`, `lookup-place-id`, `onboarding-plan-catalog`, `payment-first-checkout`, `payment-first-onboarding`, `payment-first-webhook`, `stripe-webhook`, `card-club-request`, `create-card-order`, `manage-personal-subscription`, `payment-first-welcome`, and `payment-first-admin`. Redeployed affected consumers after provider compatibility fixes.
- The four business offers return available with `checkoutVersion: 2`. Unversioned requests from the currently published business page retain their existing separate-Club contract; version 2 uses the combined subscription. Unknown explicit versions reject before Stripe.
- Live Stripe account: `acct_1SGoTmDg8DaTuVNZ`. Existing business and Club products/prices were reused without altering current subscriptions.

| Personal item | Live Stripe configuration |
| --- | --- |
| Two physical custom cards, $39 once | Product `tapaway_personal_cards_v1`; price `price_1USlnhDg8DaTuVNZvpuFiScC` |
| Optional hub, $5/month, no trial | Product `tapaway_personal_hub_v1`; price `price_1USlnpDg8DaTuVNZebiRWrPS` |
| Personal hub billing portal | `bpc_1USlo1Dg8DaTuVNZovODPDXA`; invoices, payment details, and cancellation at period end; price switching disabled |

The public live identifiers are backend defaults with environment overrides. Verified test prices are `price_1USm78Dg8DaTuVNZx9vtwzM6` (cards) and `price_1USm79Dg8DaTuVNZd7oJM6G8` (hub); use them only as `PERSONAL_CARDS_PRICE_ID_TEST` and `PERSONAL_HUB_PRICE_ID_TEST` in a separate test runtime. The dedicated personal portal does not replace the existing default business portal.

Payment-first webhook `we_1UQbMgDg8DaTuVNZKENOthlU` now receives checkout completion, delayed payment success, invoice paid/payment failed, subscription updated/deleted, charge refunded, and dispute created. Signature/mode verification and `pf:<event-id>` deduplication remain. Handlers accept the current Clover nested shipping and invoice-line fields as well as the pinned SDK shape. Unpaid delayed checkouts cannot release artwork for printing. Initial-purchase refunds/disputes hold production; a later hosting renewal refund does not refund the original cards.

Lovable verified the presence of live/test Stripe keys and signing secrets, the existing AI gateway key, and email credentials/sender/internal address without revealing their values. Production remains in live business mode. `PERSONAL_CARDS_ENABLED` remains unset. Never flip this shared production backend into test mode for a preview check.

## Remaining launch checks

- Complete a paid **Stripe test-mode** purchase through a separate test runtime, including signed webhook delivery, account handoff, and the admin download. The existing preview and published site share the production backend; current mode selection is global.
- The isolated real-Stripe checkout runner passed all 10 requests without touching the production database, auth, email, or mode. Every session was expired unpaid. This is distinct from a paid end-to-end purchase.
- Verify actual transactional email delivery and a physical sample from the installed printer/ribbon/NFC stock. No real email or customer charge was sent during this pass.
- Enable personal purchasing and publish the reviewed frontend only when those checks and owner review are complete. Do not merge/publish just to view the changes.

## AI knowledge and limits

Update `supabase/functions/_shared/storefrontKnowledge.ts` for shared FAQs and reviewed AI knowledge, then redeploy `storefront-support`. The deployed function uses the existing Lovable AI gateway with `google/gemini-3.1-flash-lite`, a 1,200-token output budget and a 20-second timeout. Truncated responses are not displayed; common questions fall back to reviewed facts. Physical-card design questions use the reviewed pre-payment instructions directly, so they cannot be confused with post-payment hub setup. The function adds current verified business prices with a two-minute cache; unavailable prices must not be guessed. The model receives no account credentials, customer records, or write tools.

The database enforces five AI attempts per visitor per UTC day, plus 20/day per network to discourage clearing local storage. Team messages have a separate five/day network limit with direct email fallback. Failed model calls consume an attempt. Daily salted hashes avoid raw IP storage. These limits deter abuse; they are not identity verification. AI is labeled and human handoff remains available.

## Evolis print workflow

The PDF has four pages: **card 1 front, card 1 back, card 2 front, card 2 back**. Sideways pages are exactly **85.6 × 53.98 mm (CR80)**; standing pages are **53.98 × 85.6 mm**. Each card’s front/back share one orientation. Pages use actual dimensions, without rotation metadata, crop marks or preview guides. Print at **100% / actual size**, not fit-to-page. When the two cards use different orientations, check driver orientation per front/back pair and prove duplex flip direction on stock before a batch. Art reaches the page edge; essential content stays within a 3 mm safe area.

Images target 300 effective dpi, approximately 1011 × 638 pixels for a full card. Text uses the browser's matching font and renders at 600 dpi to preserve Unicode and editor appearance. QR modules are vector black with a white quiet zone. Raster text may require Evolis driver black-extraction settings; a PDF cannot force K-panel or overlay behavior.

The stated ribbon is **R5F208A100**. Evolis' [compatibility chart](https://downloads.evolis.com/evolis/documents/consumables-compatibility-chart.pdf) lists the **R5F208 family for Primacy 2**, not original Primacy. Confirm the installed model and ribbon in Evolis Print Center before production. The [Primacy 2 specification](https://us.evolis.com/wp-content/uploads/2021/12/Specsheet-Primacy2-ENG.pdf) supports the CR80/300-dpi target.

YMCKO supplies color, black, and protective overlay; two-sided color printing uses a panel set per side. Select correct ribbon/card type, duplex/manual-flip orientation, overlay, and black extraction. Print a sample on the actual NFC stock; check color, small text, edges, front/back orientation, QR scans, and NFC. Screen previews cannot guarantee exact dye-sublimation color matching.

In the admin queue, download the PDF/source, verify destinations, approve, print, **encode/test NFC separately**, then mark printed. Shipping requires carrier/tracking. Test orders are visibly labeled and must not be fulfilled. PDF export neither configures the printer nor programs NFC.

## Replace product photos

Add approved photos to `public/personal-cards/` or the existing asset store and fill `src/data/personalCardPhotos.ts` with `src`, `srcSet`, `alt`, and `caption` entries. The gallery handles transitions and layout without changes to checkout/templates. The owner-supplied two-hands photo now appears in the homepage business section, and the networking/meme-card photo appears in the personal section. The original lossless WebP assets remain under `public/product-photos/`. Delivery uses optimized business versions at 480/768/1024 pixels (71–244 KB) and a 186 KB personal image, retaining full card proportions. The main business hero is 57–144 KB instead of the original 2.2 MB PNG. Desktop, tablet, and phone layouts were visually reviewed. Existing testimonial portraits were reused, not generated.

## Verification

- **Real Stripe test API:** all 10 actual-handler checkout requests passed. Personal was $39 one-time or $44 initially with $5/month hosting. Business was $0 at checkout during its trial, with renewal line items $20/$25 monthly, $199/$259 yearly, $39/$44 monthly, and $390/$450 yearly. All sessions were expired unpaid, with zero left open. Database/storage/auth/email were isolated fixtures; no paid webhook, login email, or portal navigation was claimed.
- **Deployed AI:** five complete answers returned HTTP 200 with remaining counts 4, 3, 2, 1, 0; the sixth returned HTTP 429. Typical tested responses took 4.6–5.5 seconds after the first call. A discovered card-design/hub-setup ambiguity was corrected with direct reviewed card-design instructions.
- **Deployed access/provider checks:** Google business lookup returned a listing; all four business prices were verified; unsigned webhooks and signed-out personal-admin access were denied. Personal catalog version 2 reports unavailable while its gate is off.
- Production Vite build and frontend TypeScript checks pass.
- Changed/new payment, personal-commerce, and support functions type-check against matching Stripe 14.21.0 / Supabase 2.39.7 and 2.81.1 npm definitions. The affected functions were then deployed successfully to Lovable Cloud; live public catalog, Google search, AI and access-denial responses were checked.
- All **32 browser fixture scenarios** pass across the full and focused runs. Home, personal, designer, business signup, and support have no horizontal overflow at 320, 360, 390, 430, 768, 1024, and 1440 pixels. New checks cover real eager hero art, keyboard-only skip link, retired advertising cleanup/no SDK requests, help and checkout without document reloads or dark frames, mobile sheet focus/Escape/navigation, Halloween dismissal/expiry, and support-page AI/human choices. Existing checkout, designer/PDF, Club, hub, and recovery checks still pass. All external traffic is mocked or blocked.
- **20 synthetic customer-scenario checks** exercise the actual support handler: beginners, recipients, Linktree/Linkme users, hub hosting/charges, designers, NFC/QR destinations, cancellation, personal-vs-business/Club/trials, both business quantities, shipping, compatibility, order-status handoff, and exact sale expiry. These verify reviewed answers, not model quality or actual customer research. Cancellation-question routing was corrected after a failing test.
- A signed, isolated **legacy webhook recovery test** verifies failure releases a claimed event, returns 500 for retry, succeeds on retry, and deduplicates success. Expanded type checking found and fixed two pre-existing scope errors (claim restoration and demo-hub handoff).
- All 24 isolated commerce checks pass. They exercise actual handlers with mocked services: Stripe signature/mode verification, pricing, immutable retries, profile identity isolation, included Club billing/eligibility, quotas, admin authorization, and refunds.
- The migration runs twice successfully in isolated PostgreSQL (PGlite), proving safe reapplication. Checks cover concurrent five-question limits, denied public order/artwork access, username redirects, canceled hosting, and test/live isolation.
- A mixed-orientation four-page PDF passed exact dimension checks and visual review. Both QR destinations decoded correctly. No physical printer was available.

```sh
npm run build
npx tsc --noEmit -p tsconfig.app.json
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-storefront.cjs
QA_MODULES=/path/to/qa/node_modules node scripts/check-personal-commerce.cjs
QA_MODULES=/path/to/qa/node_modules node scripts/check-storefront-database.cjs
# Uses an existing TEST key, refuses live keys, isolates all non-Stripe side effects:
QA_MODULES=/path/to/qa/node_modules node scripts/check-stripe-checkout-integration.cjs
```

Separate QA dependencies: Playwright/Chromium, Stripe 14.21.0, and `@electric-sql/pglite`. Optional `BROWSER_EXECUTABLE`, `BROWSER_ARGS` (JSON), `QA_ASSETS`, and `QA_SCREENSHOTS` configure browser checks. App additions are `pdf-lib`, `qrcode`, and QR typings; the lockfile also reconciles previously declared Lovable dependencies.

Real Stripe checkout pages, provider AI responses, email delivery, and physical fulfillment are not proven by isolated fixtures. Conversion gains and sales growth need measurement after release.

## October 21 mobile and tracking pass

- Personal pricing is visible in the main Pricing section, clearly labeled $39 once for two cards with optional $5/month hosting; business subscriptions have their own heading and verified prices.
- Primary internal navigation uses client-side links; signup/support/designer chunks preload on hover, focus, or touch intent. Slow/cold storefront routes keep a white loading surface. Dashboards retain their theme preference.
- The mobile navigation uses an accessible side panel with product explanations. Supplied product photos have a compact, uncropped mobile layout. Skip navigation stays visually hidden until keyboard focus.
- Meta/Facebook and Trybe browser SDKs, server advertising emitters, checkout visitor attribution, fbclid capture, and their configuration references are removed. The advertising acceptance popup and cookie-settings action are removed. Previously saved browser advertising IDs are cleared on boot; historical external records are not claimed deleted.
- First-party hub/product metrics remain. They use an in-memory visit ID and no persistent returning-visitor ID; ordinary login, checkout/design, preference, and support-limit storage remain. Privacy/storage pages describe this change without claiming all technical information is anonymous.
- The five changed functions (`create-checkout-session`, `payment-first-checkout`, `stripe-webhook`, `verify-personal-checkout`, `storefront-support`) were deployed from `77466ae`. Obsolete Cloud secrets `TRYBE_ORDERS_API_KEY`, `META_PIXEL_ID`, and `META_CONVERSIONS_API_TOKEN` were deleted. `VITE_META_PIXEL_ID` was removed from the source environment file and was not a Cloud secret. Frontend publishing and enabling personal payments remain separate from preview review.

### Final deployed checks

- Live help returned five HTTP 200 answers with remaining counts 4/3/2/1/0, then HTTP 429 on question six. No team messages or emails were sent.
- A live photographer-persona answer incorrectly suggested buying hosting after payment. Knowledge and reviewed answers were corrected and `storefront-support` alone was redeployed from `1bad22e`. The same live model question then correctly stated: select hosting before checkout ($44 initially), design cards before paying, and customize the purchased hub after payment. A separate add-on-timing question returned the same correct ordering. Final model/reviewed responses took 6.64/3.89 seconds from the test environment; this is not a page-load benchmark.
- Both unsigned webhook endpoints returned HTTP 400. All four business prices remain verified. The personal catalog remains HTTP 200 with purchasing and hosting unavailable while its launch gate is off.
- **77 local checks pass:** 32 browser scenarios, 24 isolated commerce scenarios, 20 synthetic customer questions/offer-expiry checks, and one signed legacy webhook recovery scenario. Frontend/backend type checks and the production build pass. Relevant image/navigation/privacy scenarios were rerun after the final asset sync.
- No frontend publication, merge, paid customer transaction, customer email, or physical printing was performed. Paid post-purchase/account/email/fulfillment validation remains the next launch gate.
