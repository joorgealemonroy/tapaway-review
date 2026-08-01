## Goal

Run a full audit of Admin, Rep, Personal/Business, and Public Hub surfaces; scan legal disclosures; probe access boundaries; then ship fixes for everything critical/warning found.

## Confirmed before planning

- `src/components/rep/SalesPartnerAgreement.tsx` (the agreement reps e-sign) still states **"$50 per new restaurant signup"** and **"$500 bonus at 30 restaurants/month"**. That contradicts the compensation actually implemented (approved-demo bounties, $50 daily base at 10 approved demos, upsell bounty). This is a signed-contract mismatch and is the top legal finding.
- Text search finds no FTC/review-policy disclaimer anywhere in the dashboard or hub-creation surfaces — it exists only on static legal pages (`Terms`, `Compliance`, `AcceptableUse`).
- Legal routes exist and are registered in `App.tsx`: `/terms`, `/privacy`, `/support`, `/refund`, `/acceptable-use`, `/dmca`, `/cookie-policy`, `/dpa`, `/compliance`, `/ai-disclaimer`, `/nfc-disclaimer`, `/affiliate-terms`.

Everything below about *current* behavior (dead clicks, empty states, RLS leakage) is unverified and is what the audit phase will establish.

## Phase 1 — Interactive audit (Playwright, admin session)

Drive the real preview and walk: `/admin` + every `/admin/*` page, `/rep` + every `/rep/*` page (both directly and via `?admin_view_rep=`), `/dashboard` (own, `?profile_id=`, `?admin_view_personal=`), and a public hub. For each page record: console errors, failed network calls, buttons that do nothing, spinners that never resolve, and empty-state rendering. Also hard-refresh on each `admin_view` URL to confirm context survives.

Double-submit check: click Save / Approve / Request Payout / Submit for Review twice quickly and confirm the second click is blocked by a disabled/pending state.

## Phase 2 — Legal & compliance

1. **Rewrite `SalesPartnerAgreement.tsx` section 2** to match the live comp plan (per-approved-demo bounty, $50 daily base on 10 approved demos, upsell bounty, admin approval as the earning trigger, TapAway's right to change rates). Bump the version line and note that reps who signed v1.0 will be asked to re-accept.
2. **Add a shared `ReviewComplianceNotice` component** (FTC/no-gating wording) rendered on the hub editor and the rep demo builder.
3. **Trial disclosure**: audit the trial/checkout modal for start date, end date, hardware-ownership statement, and expiry behavior; add whatever is missing.
4. **Rep payout disclaimer**: 1099 independent-contractor + bonus-qualification text on the payouts/commissions surface, not only inside the agreement dialog.
5. **Legal footer**: one shared footer (Terms · Privacy · Support) verified present on public pages, `/auth`, and all three dashboards; add where missing.

## Phase 3 — Security boundaries

- Query the database for RLS policies on `sales_reps`, `commissions`, `payouts`, `personal_profiles`, `client_errors`, then test as a second rep identity that Rep A cannot read Rep B's rows.
- Hit admin-only edge functions with a non-admin token and confirm 401/403.
- Load `/admin/*` while signed in as a rep and confirm redirect, not render.
- Inject `"><img onerror>` / emoji / RTL characters into business name, social URL, and admin note fields; confirm escaping on render and that URL normalization rejects junk.

## Phase 4 — Report + fixes

Deliver a categorized report (🔴 / 🟡 / 🔵) in chat, then implement all 🔴 and 🟡 items in the same pass — code changes plus a migration only if RLS gaps are found. 🔵 items get listed for you to approve separately.

## Technical notes

- Audit scripts live under `/tmp/browser/`, nothing added to the repo.
- Agreement change is copy-only; no change to the commission engine or the `award_daily_base_trigger` logic.
- Any RLS fix ships as a single migration with explicit GRANTs.
