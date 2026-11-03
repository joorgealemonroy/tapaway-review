# Roadmap

## Focused invitation email access correction (2026-11-03)
- [x] Isolate OTP auth client, retain validated generated signup/magiclink type without changing RPC permissions or schema; old unprefixed links preserved.
- [x] Pinned-SDK intercepted-fetch checks reproduce old bearer replacement and prove isolated service association; 22 invitation checks, 11 invitation PostgreSQL checks, 25 release suites and both security gates pass. Deployed subscription-invitation and dependent payment-first-webhook; review note updated. No frontend publication or real customer actions; hosted real login unverified by restriction.

## Optional existing-hub subscription invitation (2026-11-03)
- [x] Add admin email-confirmed invitation with QR/copy/share, separate from Require payment, in both Accounts & Hubs views.
- [x] Implement owner-bound checkout, paid activation and one-use emailed access for both eligible hub types; preserve free public access and existing claim links.
- [x] Apply additive migrations 0037/0038 and deploy subscription-invitation, payment-first-webhook, stripe-webhook, card-club-request. Customer hashes unchanged: 144 personal/14 restaurant rows; zero invitations. No purchases/emails/publication.
- [x] Pass 17 provider-double invitation checks, 11 isolated PostgreSQL checks, 25 release suites, security source/test checks and new-screen lint; browser fixtures pass 320/360/390/1280 widths. Preview build OK. Hosted paid/email/login flow remains deliberately untested under the no-purchase/no-email restriction; GitHub production CI is the review step.

## Las Islas PDF correction (2026-10-31)
- [x] Keep only the upper menu action for the two exact IDs; open the unchanged original PDF in a new tab with analytics, removing the text viewer and its styles.
- [x] Verified both hubs at 320px, 360×800, 390×844 and desktop: one anchor, correct PDF/new tab, intercepted analytics, return/history, no overflow or scroll lock; original /islas and both children pass. Hosted PDF HTTP200/application/pdf, exact SHA and eight readable pages verified; local CDN responses use those exact bytes. All 23 offline suites and source/security checks pass; automatic preview build OK. No database changes or publication; production build remains for CI.

## Authorized Las Islas menu update (2026-10-31)
- [x] Transcribe and independently verify all eight PDF pages, 20 sections/155 items; private exact snapshot and restoration SQL saved.
- [x] Import identical menus transactionally into only the two legacy restaurant menus; 310 items total, unchanged restaurant and other-menu hashes; stable unchanged PDF hosted.
- [x] Add a scoped accessible mobile menu with search, categories and browser history; preserve other hubs and route race protection.
- [x] Verify both real location links at 320, 360, 390 and desktop; search/categories/loading/error/retry/Back/Forward/Escape/scroll release and original Islas routes pass. Corrected existing narrow logo overflow only for target hubs. 23 offline release suites, 8 menu rules, source/security checks and automatic preview build pass; no publication.

## Focused hub navigation race fix (2026-10-31)
- [x] Reset route ownership immediately and ignore superseded profile/resolver lookups without changing public gates or hub contents.
- [x] Add seven async regression checks; delayed real location links, cold loads, back/forward and fast history passed with zero false missing frames. Missing route confirmed; access gates covered offline.
- [x] Run 22 offline release suites, source/security tests and dependency audit; automatic preview build OK. Focused lint retains eight pre-existing findings unchanged; standalone production build/artifact scan not manually run under harness restrictions. No publication.

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


## Existing-card activation review
- Added a clear monthly activation option for existing business cards.
- Added an admin control and mobile activity summary.
- Release verification continues in the review preview.
