## Sales Partner Portal — UX polish pass

### 1. Dismissible W-9 banner (1-day snooze)
- `RepTaxBanner.tsx`: add a small "Remind me later" close button. Persist dismissal in `localStorage` under `rep_w9_snooze_<repId>` with a timestamp; hide banner while `Date.now() - ts < 24h`. Re-appears after 24h automatically. Never snoozable when status is `rejected` (must act).

### 2. Rep Home — remove all money/base-pay framing
- `RepHome.tsx`:
  - Delete the "Recurring at a glance" section entirely.
  - Remove any base-pay / daily-quota / commission dollar references.
  - Replace with a positive, non-financial hero: a "Today" card showing (a) demos built this week, (b) a rotating encouragement line ("Every demo is a door opened."), and (c) two primary CTAs: **+ New Demo** and **View Pipeline**.
  - Keep the existing W-9 banner logic (now dismissible per #1).

### 3. Move payout-readiness prompts to Commissions
- `RepCommissions.tsx`: add a compact "Payout readiness" strip at the top with two checklist rows:
  - **W-9 on file** — status pill (Missing / Pending / Approved / Rejected) + "Upload" link → `/rep/profile`.
  - **Bank details for ACH** — read `sales_reps.payout_method` (already loaded). Show Missing/On file + "Add bank details" link → `/rep/profile`.
- Remove the W-9 banner from Home only if user prefers — plan keeps it on Home too (dismissible) so it doesn't disappear silently. Confirm if you want it Commissions-only.

### 4. Businesses page
- `RepBusinesses.tsx`: rename header "My Pipeline" → **"My Businesses"** (subtitle keeps the count, e.g. "21 businesses in your book").
- Add a search input above the list: filters client-side by business name and slug (case-insensitive `includes`). Reuses existing list; no backend change.

### 5. Fix "Pending Validation" metric on Commissions
- Current logic sums commissions with status `pending` / `trial_pending`. Diego has submitted demos with no commission row yet (bonus is only written on approval), so nothing shows as pending.
- New logic: "Pending Validation" = count + implied value of `personal_profiles` where `created_by_rep_id = rep.id` AND `submitted_for_review = true` AND `is_approved = false`, valued at $5/demo (demo bonus rate).
- Display: `$X.00 pending — N demos awaiting admin review` on the middle stat card. Still merge in any true `pending` commission rows if present.

### Technical notes
- No schema changes. All new data comes from existing tables (`personal_profiles`, `sales_reps`, `commissions`).
- Snooze uses `localStorage` (per-browser, acceptable for a "remind me tomorrow" nudge).
- Search is client-side over the already-fetched list.

### Files touched
- `src/components/rep/RepTaxBanner.tsx` — dismiss button + snooze.
- `src/pages/rep/RepHome.tsx` — strip money content, add positive Today card, remove "Recurring at a glance".
- `src/pages/rep/RepCommissions.tsx` — Payout readiness strip, corrected Pending Validation calc.
- `src/pages/rep/RepBusinesses.tsx` — rename header, add search box.
