# Owner workspace refresh

Jorge's daily work is now organized into Overview, Hubs & accounts, Orders & printing, Messages, Insights and Tools. Existing specialized tools and hub editors remain available within the same light navigation shell. Login shares the storefront palette and has an explicit Back to TapAway link.

## Billing and gift accounts

The owner goal is $10,000 in monthly recurring subscription run rate. The server reads actual live Stripe subscriptions once, uses quantities and interval counts, and normalizes annual prices. Trials, paused collection, overdue accounts and one-time card sales do not inflate the goal. Discounted, tiered, usage-based and non-USD contracts are visibly excluded for review. This conservative estimate is not Stripe's configurable MRR report or cash collected. Billing failures retain previously loaded data, allow retry, and never masquerade as zero revenue.

The production inspection found 124 records marked trialing without a linked subscription. These are not automatically reclassified: some may be draft demos. The dashboard only counts trials returned by Stripe. The directory distinguishes Gift account from No subscription and offers an explicit gift action only for unbilled hubs. No production account status was changed as part of the redesign.

Trial nurture and trial-ending jobs now require a linked subscription and exclude complimentary access. Reconciliation ignores unbilled/gift accounts and no longer treats a transient Stripe failure as cancellation. Deploying these jobs does not invoke them or send anything.

## Notifications

New tables and protected RPCs support in-app updates and offers. Save/preview freezes a deduplicated recipient snapshot. The final send checks the reviewed draft version, locks it, and inserts one immutable notification per account in a single transaction. Retrying a send cannot duplicate deliveries. Customers can only read their own notices and mark those notices read. Campaigns, recipient lists and drafts remain admin-only. Table mutation privileges, including TRUNCATE, are revoked from browser roles.

The admin composer previews content, shows recipient count, stores drafts, and requires an explicit Send action. Customer dashboards have a small Updates inbox. Email tools remain separate and unchanged. The new composer never sends email/SMS or applies referral billing credits. No real campaign was sent during implementation.

## Find and analytics

Quick find searches hubs and tools locally; optional AI maps natural-language requests to a fixed route catalog. The server verifies admin role, caps AI to 30 requests per hour, applies a timeout, and rejects invented destinations. Hub names and customer details are not sent to the model. It cannot modify records or send campaigns.

Insights and directory counts use analytics_hits, validated human traffic, and server aggregates rather than row-limited browser downloads or mixed legacy tables. Website views and hub views are separate; views are not called NFC taps. Visit sessions are in-memory identifiers, not people. Returning-visitor metrics are omitted because they cannot be supported without persistent identifiers. Preview, development, bot and internal traffic are excluded. Signed-in customers are no longer all marked as staff. Browser financial-conversion claims are blocked; billing metrics come from Stripe. The ingest handles Unicode/long scalar properties safely and rejects missing/unrecognized origins from human counts.

## Validation

- 10 isolated browser scenarios: desktop/mobile owner UI, 320/390/768 widths, role and billing recovery, honest billing failure, denied customer access, hub filtering/editor destinations, AI navigation, unsent notification preview, insights and login/back navigation.
- 12 isolated PostgreSQL checks: role enforcement, unbilled gift action, recipient deduplication, subscriber audience, safe internal links, draft version conflicts, atomic/idempotent delivery, customer inbox RLS, immutable notification content and analytics filtering.
- 12 actual-handler checks with isolated providers: billing intervals/quantities, trial/test exclusions, duplicate subscriptions, unsupported pricing, unauthorized callers, provider failure, AI route allowlist/quota, financial event rejection, Unicode props and unknown origin classification.
- Frontend and changed edge-handler TypeScript checks; production Vite build.
- Targeted existing storefront regression checks.

Provider readiness: all six functions deployed and compiled at 87dd489. The actual Stripe 22.6.0/API 2026-08-26.dahlia read-only probe returned 35 total live subscriptions, 9 supported paid-active subscriptions, zero current trials and zero unsupported pricing contracts. The real AI gateway returned the allowlisted orders destination. These were direct provider checks, not authenticated endpoint tests.

The migration uses plain auth user identifiers (no foreign keys into the managed auth schema), explicit service-role grants, browser SELECT-only grants and RLS in one transaction. Send still validates recipients against existing auth users.

Backend migration: 20261021090000_admin_workspace.sql. Functions: admin-billing-summary, admin-navigator, track, trial-followup, trial-ending-email, reconcile-expired-trials. Production frontend remains unpublished; review in Lovable first. Existing personal commerce live gate remains unchanged.
