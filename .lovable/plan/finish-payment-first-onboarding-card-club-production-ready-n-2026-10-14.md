# Finish payment-first onboarding + Card Club (production-ready, not public)

Everything below is done in Stripe TEST mode. The public signup does not change: normal visitors stay on the current flow, and only `/onboarding?flow=payment_first` uses the new one. It ends with one readiness report and a READY / NOT READY verdict.

## Current state (checked)
- Nobody is marked as keeping the old monthly free cards yet: 0 records. Under today's rule (active or trialing), about 143 Solo/Pro profiles and 14 business accounts would qualify. I'll get the exact count before marking anyone.
- The test-mode Stripe key exists. The test webhook signing secret (`STRIPE_TEST_WEBHOOK_SECRET`) does **not** exist yet. The live `STRIPE_WEBHOOK_SECRET` exists, but it belongs to the old webhook, not the new one.
- There are 6 existing orders (statuses: awaiting_onboarding, pending). I'll reuse those statuses rather than adding new ones.

## Order of work
1. **Keep existing customers' free cards (step 2 in your brief).** Add fields for when and why someone was marked. Count everyone who qualifies under the current production rule, then mark that fixed group once. Running it again changes nothing, and it never turns a yes back to no. Re-count afterwards. Only then does the rule for new customers go live.
2. **Free-card rules.** Three separate cases: existing customers keep their benefit; new customers with Card Club get Card Club cards; new customers without it get "Contact us for reprint pricing". This rule only affects payment-first customers.
3. **Card Club timing.** Every date rule lives in one database check:
   - First free batch: 30 days after the first Card Club payment that actually went through.
   - A request waits as "pending", and only one can be pending at a time.
   - Approving a request starts the next 30 days. Rejecting or cancelling a request gives the customer their eligibility back.
   - Add admin-only approve and reject actions. Keep the existing protection against duplicate requests.
4. **Stripe webhook signing.** Nothing in the database changes until Stripe's signature checks out. Remove the unsigned fallback. Test mode uses `STRIPE_TEST_WEBHOOK_SECRET`; live mode uses a new `PAYMENT_FIRST_WEBHOOK_SECRET_LIVE`, created at go-live. Also read the subscription from both places newer Stripe versions put it on invoices.
5. **Test records.** Mark every purchase as test or live based on Stripe. Test orders never reach the print queue, revenue figures or real eligibility, and the admin page labels them TEST.
6. **Automatic first order.** A successful purchase creates a setup-pending order with customer, subscription, plan, quantity, shipping, Card Club choice, order reference and campaign source. It enters the print queue only when admin marks it ready.
7. **Draft hub.** Once the business is confirmed, create a draft, unapproved customer page using the existing page system. Store the Google Place ID and business details. Unapproved pages already stay off the public site.
8. **Resume setup.** Every `/welcome` step saves right away, and the email sign-in link returns customers to their next unfinished step.
9. **Admin `/admin/new-orders`.** Show every field from your brief. Actions: setup status, page ready, artwork ready, move to print queue, approve or reject replacements, retry Card Club setup, admin override, open customer. Put the retry function live.
10. **Customer dashboard.** States for active, pending request, approved, declined and cancelled. Never show a Join or Rejoin button.
11. **Analytics.** Add all listed events to the existing tracker and make sure campaign sources survive Stripe Checkout.
12. **Put the remaining functions live:** tracking, the free-card request, admin retry, and the updated webhook, checkout and setup functions.
13. **Full 45-case test** using Stripe test clocks: the first Card Club payment after the trial, a failed payment and recovery, and the approval timing. Then check 360px, 390px and desktop, and the existing claim, sales rep, van, login and dashboard flows.
14. **Clean up test data.** Count, then delete, only records clearly from payment-first testing (`tap+pftest…@tapaway.co`, Stripe test mode). That includes the fixture membership I marked as paid 31 days ago. Anything unclear is left alone and listed.
15. **Readiness report**, including the exact switch that makes the new flow the default. The old signup stays available as a fallback.

## Needed from you
- **`STRIPE_TEST_WEBHOOK_SECRET`.** In Stripe (test mode) → Developers → Webhooks, open the existing endpoint pointing to `…/functions/v1/payment-first-webhook` and copy its signing secret (starts with `whsec_`). I'll ask for it in a secure form once this plan is approved. If it isn't added, I'll finish everything else and report signing as the one blocker.

## Technical details
- Admin-only database functions for approve and reject. The 30-day timer now starts from the approval time instead of the request time, still checked inside one locked transaction.
- Webhook flow: raw body → `constructEventAsync` → claim the event so repeats are ignored → process. A missing or bad signature returns 400.
- Test clocks: test checkout attaches a test clock to the Stripe test customer, then the clock is advanced past the trial. Live behavior is unchanged.
- Order rows go into the existing `fulfillment_orders` table with a test/live flag. The draft page is a `personal_profiles` row (`is_approved=false`, `pipeline_status='setup_pending'`) owned by the customer.
