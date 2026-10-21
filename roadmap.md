# Roadmap

## Final raw-profile privacy migration (2026-10-21, 31f37bf6)
- [x] Run isolated PostgreSQL suite: 14/14 passed; apply private_profile_records once as drizzle/migrations/0027_private_profile_records.sql. Applied SQL differs from reviewed source only by one extra indentation space before the booking helper SELECT; semantics unchanged, not byte-identical. No repair rerun, function deployment, publication, provider work or customer mutations.
- [x] Anonymous Data API raw-profile SELECT returns zero rows; all six requested slugs resolve through the personal RPC (one row each), restaurant RPCs return zero. RLS remains enabled; owner/rep/admin policies remain; public RPC is SECURITY DEFINER with fixed search_path; approved legacy unbilled gift count remains 108 (explicit complimentary count is zero).
- [ ] Production SQL role-context checks are blocked: the read-only runner cannot SET ROLE anon/authenticated or execute public RPCs. Anonymous runtime denial verified through Data API; unrelated authenticated identity denial and owner access passed isolated tests, but production authenticated runtime access remains unverified.

## Final narrow deployment (2026-10-21, c3ec6ab6)
- [x] Run the 16 isolated launch-handler checks: 16/16 passed with no external fixture traffic; deploy only send-mass-sms (submitted source SHA-256 f9e308d4d112521a90d4d8df64d435b41728bfa9c32a0a8f1b357d7c1429afff). No real sends.
- [x] LIVE recheck confirmed sub_1UAtXuDg8DaTuVNZUPKMuBVn active and sub_1TLK42Dg8DaTuVNZsO9g1VIM canceled since 2026-05-04T16:42:40Z; both customers matched and each had only the specified subscription. Both local payment states were unknown_manual, not gifts. Executed the reviewed data-only SQL once via Cloud run_sql, not the DDL-only migration runner; no migration journal entry was created.
- [x] Read back exactly the two rows: personal profile 1878025d-6a5c-462f-ba3e-9331f7d30a6d active; restaurant c668ed9e-398d-43d7-ab0f-58175c5b95ec canceled; subscription/customer IDs and payment states unchanged. Unmatched subscriptions remain unassociated; no frontend publication, feature-switch changes, messages, charges or Stripe writes.

## Reviewed follow-up deployment (2026-10-21, 4e317cda)
- [x] Verify exact reviewed commit and deploy claim privacy migration once.
- [x] Deploy payment-first webhook, claim checkout and discovered email-helper dependents; preserve all flags and frontend publication state.
- [x] Run isolated checks: database 11/11, launch handlers 13/13, commerce 24/24, browser fixtures 44/44; production dependency audit reports zero vulnerabilities.
- [x] Attempt one hosted Stripe TEST checkout; browser submit remained on Stripe without a completion/error, API reported open/unpaid; verify refused activation and cleanup expired the session. No CAPTCHA/protection bypass.
- [x] Inspect shared-logger send paths: no authenticated sink-only path available without account state or other recipients. No email sent; signing secret absent and no provider endpoint created.
- [ ] Resend delivery setup requires owner to create the delivery webhook in Resend and enter its signing secret in Project Settings → Secrets; delivery correlation remains unverified.
- [ ] Hosted TEST payment and isolated activation remain unverified after the browser submission blocker; real email/access/login checks are separate. Personal buying remains off.

## Launch hardening deployment (2026-10-21)
- [x] Apply reviewed launch-hardening schema once; verify guards, RPC predicates, grants and RLS.
- [x] Deploy all shared-helper dependents and explicitly requested entrypoints without publishing frontend.
- [x] Run isolated Stripe checkout/paid lifecycle, commerce, launch-handler and database checks.
- [x] Verify live Stripe webhook subscriptions, auth redirects, sender DNS and unchanged feature gates.
- [ ] Configure Resend delivery endpoint and persist signing secret: blocked by unavailable secure runtime-to-Cloud secret transfer.
- [ ] Send branded test-sink email and verify delivery/log correlation: blocked by signing-secret setup and unavailable runtime service-role logging credentials.
- [ ] Verify hosted TEST Checkout through activation and email/access before enabling personal buying; personal buying remains off.

- [x] Temporarily hide every /examples entry point (desktop/mobile nav, hero, dashboard mock) while keeping the page reachable by direct URL.
- [ ] Complete homepage pricing/navigation/theme and honest offer copy using the verified catalog.
- [ ] Align onboarding summaries, accessible fields, selection persistence and final disclosures.
- [ ] Implement consent revocation and fail-closed server advertising; document persistence blockers.
- [ ] Correct public heading/metadata fallbacks without changing customer status.
- [ ] Verify public flows, responsive layouts, tracking and source safeguards; prepare review, no deploy.

- [x] Muse AI secure bridge: edge function with API key auth, read endpoints for whitelisted tables, restaurant update + create endpoints. Deployed; MUSE_AI_API_KEY saved by user.
- [x] Match the Solo overview blocks to the provided reference while preserving the rest of the dashboard; remove the Solo “Your setup” section.
- [x] Build real NFC card showcase and secure admin manager per approved plan
- [x] Repair and validate the physical PVC card showcase, reusable 3D admin preview, and rotatable interactions
  - [x] Use slow continuous rotation without play/pause and enlarge the mobile card
  - [x] Validate responsive camera framing without changing physical card dimensions or per-design displayed scale
- [x] Add the three supplied business card pairs, rotate between enabled businesses, and verify high-quality desktop/mobile drag
- [x] Correct uploaded card-back orientation, start with Las Islas Portland, and remove the Sugar Bloom loading flash
- [x] Remove the business-name and arrow controls beneath the homepage card showcase
- [x] Pair each rotating card with its matching live hub in the homepage hero, extend admin management, optimize loading/cycle timing, and provide desktop/mobile/recording evidence
- [x] Correct homepage showcase phone proportions, live-data hub preview, card alignment, finish, and matching verification evidence
- [x] Render each showcase phone from the matching hub's complete live profile, links, blocks, and styling
- [x] Restore XOL with its correct hub, add Paperboy as a separate card and hub, and fill the phone screen vertically
- [x] Redesign onboarding plan selection with exact cached Stripe mappings, no Loss Protection, persistent attribution, and separated trial/new-customer/renewal reporting
- [x] Refine onboarding into a dark quantity-first 4-card versus 15-card decision without changing checkout logic

## Payment-first finalization (approved 2026-10-14)
- [x] Grandfather legacy allowance per unique customer/subscription (dedupe; report raw vs unique)
- [x] Draft hub in correct existing model per plan/customer type
- [x] Payment-first functions gated behind flag until GO LIVE
- [x] Webhook signature + livemode check
- [x] Card Club approve-based timing, admin approve/reject
- [x] Auto setup-pending order, test/live flag
- [x] Analytics, deploys, test matrix, cleanup, readiness report
- [ ] Existing-email purchase: verify association after real email sign-in (needs a signed-in test)
- [ ] Regression run of claim / rep / van flows
- [ ] GO LIVE (owner approval): live webhook + secrets + flag

## Hub payment request deployment (2026-10-21, commit 07e28cc1)
- [x] Applied 0029_hub_payment_requests.sql + 0030_fix_hub_payment_offer_filter.sql (corrective: restored exact reviewed empty-string filter in get_hub_payment_offer)
- [x] Deployed hub-payment-request, payment-first-webhook, stripe-webhook, personal-card-order, payment-first-welcome
- [x] Smoke: unsigned payment-first-webhook 400; unauthenticated require 403; RPCs service-role-only; hub_payment_requests empty; onetwentythreeburgerco unchanged
- [x] Published tapaway.co bundle lacks the reactivation UI (preview-only); build OK
- [ ] BLOCKER (root source fix needed): hub-payment-request summary/status/checkout-global quota limits (300/20000/1000) exceed storefront_take_quota hard max of 100 -> fail-closed 503. Lower limits to <=100 or raise limiter cap via reviewed migration.
