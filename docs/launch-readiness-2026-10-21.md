# TapAway launch review — October 21, 2026

**Release decision: hold public frontend publication.** Backend protections and source fixes have been implemented, with passing automated checks. Real hosted checkout → account → email → login has not yet passed end to end. Personal purchasing remains disabled. Existing business live billing stays enabled.

## Changes completed

- Browser inserts and updates cannot grant paid status, approval, Stripe linkage, complimentary access, paid tools, or repeated trial extensions. Ownership and billing fields are server/admin controlled.
- Paid trials expire at the database access boundary even when an event is delayed. The 108 approved, unbilled gift/demo hubs in the reviewed snapshot retain access; explicit complimentary accounts remain supported.
- Business activation checks the completed checkout, current Stripe subscription, customer, price and environment. Setup has retry leases; interrupted profile linking recovers without duplicating a hub. Existing-account purchases require email ownership confirmation.
- Old verification endpoints cannot reactivate a canceled subscription from a historical checkout. Existing users are not forced into a password reset by replaying checkout verification.
- Current Stripe lifecycle events update both current and legacy linked accounts by exact subscription ID. Old events cannot overwrite a replacement subscription by matching customer alone. The older webhook's event list was deliberately not expanded because it has separate commission, email and archival side effects.
- Purchase thank-you emails use the shared branded sender and send log, with clear next steps and a single-use setup link where appropriate. Failed delivery attempts can retry independently of completed activation. Concurrent ordinary retries are serialized; this is not a claim of perfect exactly-once delivery across process crashes.
- Email history labels provider acceptance separately from delivery, bounce and complaint, and includes purchase email filters. Bodies and access tokens are not stored in the send log. Signed delivery events handle duplicates, out-of-order events and events arriving before the send log.
- Customer AI checks verified ownership and entitlement, has durable shared account/provider quotas, bounded request sizes and provider timeouts. Public support retains five questions per visitor per day, a network limit and a global daily ceiling. Customer AI has 30 requests per account per day and a global daily ceiling.
- SMS now requires an eligible paid/trial/gift account after ownership verification. Limits are three campaigns and 500 recipient attempts per account per day, 500 recipients per campaign and 2,000 recipient attempts globally per day. Review-request hashes are reserved before provider calls, closing a concurrent-send race. An ambiguous timeout stays reserved because the provider may already have accepted the message. No SMS was sent during this review.
- Raw profile records are restricted to owner/assigned-rep/admin policies. Public hubs continue through the existing projected RPC; booking availability and legacy analytics compatibility are preserved. Paid setup drafts stay private until approval.
- Public claim previews no longer expose account email/contact details or private analytics to anonymous visitors. Public branding remains available for existing claim links.
- React Router and compatible dependencies were patched. Browser routing retains the previously enabled v7 behaviors. The animation build plugin is classified as a development dependency.

## Verification evidence

| Check | Result | Scope |
| --- | --- | --- |
| Browser regression suite | 44/44 passed | Local app, mobile/desktop, mocked or blocked external services; storefront, checkout selection, designer, support, auth, customer and admin flows |
| Commerce handler suite | 24/24 passed | Actual handlers with isolated database/auth/Stripe/email fixtures; signature and mode checks, duplicate events, delayed payment, Card Club, refund holds, price and PDF validation |
| Launch handler suite | 16/16 passed | Activation retries, unpaid/canceled rejection, account ownership, current billing state, AI quotas, signed email events and SMS access/concurrency/quotas; no external traffic |
| PostgreSQL safeguards | 14/14 passed | Isolated PostgreSQL using production schema/function fixtures; billing guards, gift access, expired trials, grants, delivery ordering and claim privacy |
| Stripe TEST checkout API | 10/10 passed | Actual checkout handlers created correct real TEST sessions; all expired unpaid, none left open |
| Stripe TEST settlement/lifecycle API | 6/6 passed | Actual TEST recurring and one-time settlement, decline, cancellation and cleanup; activation used simulated completed-checkout envelopes and isolated account/email fixtures |
| Hosted Stripe TEST checkout | Not passed | One $44 hosted checkout was submitted with documented test credentials; Stripe stayed open/unpaid with no explicit error. CAPTCHA frames existed, but the exact cause is unconfirmed. Verification refused activation; session expired, no customer/subscription attached |
| Frontend and changed edge TypeScript | Passed | Source type checks |
| Production build | Passed | Large-chunk warnings remain; this is not a production-network performance benchmark |
| Production dependency audit | 0 known vulnerabilities | `npm audit --omit=dev`; browser/runtime npm dependency graph, not a certification of every Deno dependency or all application code |
| Full development dependency audit | 14 advisories remain | 6 high, 8 moderate in Vite/Tailwind/Drizzle and build-tool transitive packages; separate toolchain upgrade and compatibility verification required |
| Source secret-pattern scan | No matches | Tracked application/public/function/script files; no server-secret variable references found in browser source |
| Welcome email visual check | Passed at 390px | Actual generated HTML rendered without overflow; CTA contrast and small-text contrast corrected; not an inbox-client rendering test |

Database verification after deployment confirmed default approval is false, billing guards run as invoker, browser maintenance/delivery writes are denied, and all 108 existing approved gift hubs still pass their access predicate.

## Production deployment

- `20261021120000_launch_hardening.sql` applied once through Cloud as `drizzle/migrations/0025_launch_hardening.sql`; shared-helper dependents deployed. A whitespace-only difference in the submitted SQL did not change its definitions.
- `20261021130000_claim_summary_privacy.sql` applied once as `drizzle/migrations/0026_claim_summary_privacy.sql`; lifecycle/claim and email-dependent functions deployed.
- Final `send-mass-sms` deployment completed with 16/16 isolated handler checks. The two-row local billing repair ran once through Cloud’s data-change tool after a fresh LIVE Stripe check; a separate read-back by Codex confirmed both corrected states. No schema migration journal entry was created for this data-only operation. Its exact SQL is retained in `scripts/ops/2026-10-21-verified-billing-reconciliation.sql`, outside the schema migration folder.
- Live payment-first webhook is enabled for checkout completion, asynchronous payment success, invoice paid/failed, subscription updated/deleted, refunds and disputes. Unsigned requests return HTTP 400.
- No frontend publication or personal purchase enablement occurred. No live Stripe charge/refund/cancellation, customer email/SMS, order approval, notification broadcast or bulk job was performed.

## Current billing associations

A read-only comparison covered all eight hub rows with linked Stripe subscriptions (seven distinct subscriptions). Six rows matched Stripe. Two needed narrow local status repair:

| Hub | Stripe truth | Local state found | Verified repair |
| --- | --- | --- | --- |
| Muchas Gracias personal hub alias | Active | Trialing | Active; preserve plan, content, ownership and billing identifiers |
| Consuelo's Barber Shop | Canceled; no replacement subscription on that customer | Active | Canceled; preserve content and Stripe history; explicit complimentary accounts excluded |

Both repairs completed after a fresh Stripe check and were independently read back. Customer/subscription identifiers and gift designations remained unchanged. All eight linked hub rows now match the verified Stripe status. The SQL changes local access status only and did not charge or change a Stripe subscription.

Three other live active subscriptions have no matching stored subscription/customer association or exact profile/account email match. **Do not assign them by business-name resemblance alone.** Owner review is required to identify the correct hub/account:

- Las Islas Gardena Inc — $19/month
- Space Studios — $30/month
- Alemar 64 — $300/year

Their existing economics must be preserved. This review did not cancel, reprice or automatically attach them to another account.

## Remaining launch gates

1. **Finish Resend delivery tracking.** Sender domain `tapaway.co`, DKIM and SPF were verified through the provider API. No permission-scope block was found. The available tooling cannot securely transfer a returned signing secret into Cloud. No orphan provider webhook was created. The deployed endpoint currently returns `503 Not configured` because `RESEND_WEBHOOK_SECRET` is absent.
   - In Resend → Webhooks, create `https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/email-delivery-webhook`.
   - Enable `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`.
   - Enter its signing secret directly in Lovable Cloud → Project Settings → Secrets as `RESEND_WEBHOOK_SECRET`. Do not paste it into chat, source code or this report.
   - Send a branded test to the provider's test sink, then verify the same Resend message ID in `email_sends` and `email_delivery_events`. Acceptance is not proof of delivery. A controlled real inbox is still needed for inbox rendering and the sign-in link.
2. **Complete hosted checkout through actual account/email/login in an isolated test environment.** The hosted automated attempt stayed unpaid; the exact provider cause was not established. API settlement and fixtures passed, but they do not prove this end-to-end journey. Do not flip the shared production backend to test mode. Personal purchasing stays off until this passes.
3. **Review the three unmatched paying accounts** and link each only to its confirmed owner/hub. Correct existing billing associations before relying on account-level billing labels.
4. **Check the delivered product.** Automated print dimensions/orientations and artwork checks passed. One physical Evolis print plus NFC tap and QR scan on iPhone/Android is still required to verify actual card quality and destination.
5. **Review real mobile/network behavior and email clients.** The browser suite does not replace checking the published assets on a real phone/network or a real inbox. Auth redirect allowlists include the custom domains and preview URLs; managed SMTP settings could not be inspected by the available tooling.

## Publication sequence and recovery

1. Resolve the gates above in the review branch/environment. Retain the existing live business mode and legacy prices.
2. Take a current database backup/checkpoint through Cloud. Record the frontend release commit, current feature flags and enabled webhook events without recording secrets.
3. Confirm schema and dependent functions are already deployed, correct catalog prices are available, protected routes reject unauthorized requests, and delivery tracking has a successful correlated test.
4. Publish the reviewed frontend from Lovable only after final approval. Enable personal purchasing only after its full journey passes.
5. Smoke-check public product pages, all purchasing CTAs, login/back navigation, support, and the admin fulfillment preview. Monitor provider failures, email delivery, webhook retries and access errors.
6. If a new purchase path fails, disable that purchase gate and restore the prior frontend release. Keep verified webhooks processing existing paid purchases. Do not remove the additive schema, reopen entitlement write permissions, delete customer data, or roll back paid orders as a frontend rollback technique.

Reproducible checks are in `scripts/check-storefront.cjs`, `check-personal-commerce.cjs`, `check-launch-functions.cjs`, `check-launch-database.cjs`, `check-stripe-checkout-integration.cjs`, `check-stripe-paid-lifecycle.cjs`, and `check-hosted-test-checkout.cjs`. The Stripe scripts refuse live keys. Always clean up an incomplete hosted test session.
