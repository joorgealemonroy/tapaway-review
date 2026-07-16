
# Sales Partner Portal — Obsidian-Dark Rebuild

Full visual + informational overhaul of the rep-facing portal. No DB schema, RLS, or webhook changes. Existing `useSalesRep`, `useAdminAccess`, `useRepNavigate`, and supabase queries stay; only presentation and computed metrics change.

## 1. Global aesthetic + navigation

- Introduce a single shared shell (new `src/components/rep/RepShell.tsx`) used by all five rep pages:
  - Background `bg-[#0a0e1a]` with subtle radial gradient overlay.
  - Top bar: logo, page title, rep name, and admin-impersonation pill (when applicable).
  - Bottom nav (mobile) + inline tab strip (desktop): Home · Businesses · Commissions · Docs · Profile.
  - Card primitive: `bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl`.
  - Text tokens: headings `text-white`, body `text-white/70`, muted `text-white/40`.
- Rename "Restaurants" → "Businesses" everywhere in the rep UI (nav label, page title, table header, empty states, home CTA "View My Pipeline"). Route stays `/rep/restaurants` to avoid breaking bookmarks; file renamed to `RepBusinesses.tsx` and re-exported from the existing route.
- `RepTaxBanner` restyled: `bg-amber-500/10 border border-amber-500/20 text-amber-200/90`, small pill "Action needed", inline "Upload W-9 →" link. Keeps existing statuses (`missing / submitted / rejected`).

## 2. Home (`RepHome.tsx`)

Remove point system, clawback callout, and Volume Bonus Tracker. Replace with three metric cards driven by existing `commissions` + `rep_restaurants` data:

- **Shift Base Pay** — today's `$50` flat, status `Earned` if a `commissions` row exists today with `type = 'shift_base'`, else `Available`. (Purely presentational; no schema changes — falls back to zero if no such row exists yet.)
- **Completed Demos Today** — count of `rep_restaurants` rows created today by this rep. Badge:
  - `>= 10` → emerald "Quota Met · Bonus Unlocked"
  - `< 10` → amber "N more to unlock $5/demo bonus"
- **Active Monthly Stream** — sum of `commissions.amount` where `commission_type = 'recurring'` and `status in ('available','pending')` for the current period. Shown as `$X.XX / mo`.

Primary CTAs:
- Solid emerald "+ Create New Demo" → `/rep/demo/new`.
- Ghost "View My Pipeline" → `/rep/restaurants`.

"How You Get Paid" accordion (static content) rewritten to three rows:
1. Daily Shift Base — $50 flat for completing daily target.
2. Production Bonus — +$5 per completed demo package, unlocks at 10.
3. 10% Monthly Recurring — passive cut per active subscriber (examples: $1.50/mo Solo Pro, $3.90/mo Venue Pack).

## 3. Businesses (`RepRestaurants.tsx` → `RepBusinesses.tsx`)

Rebuild as a compact CRM table using existing `rep_restaurants` fields (`pipeline_status`, `card_print_pdf_path`, `custom_slug`, `expires_at`).

Columns: **Business Name · Date Created · Status · Card PDF · Action**

- Status cell: existing `<Select>` swapped to a dark-styled variant with a colored dot before each label:
  - `draft` — slate-400
  - `card_ready` — amber-400
  - `delivered` — blue-400
  - `converted` — emerald-400
  - `inactive` — zinc-500
- Card PDF cell: if `card_print_pdf_path` present → "View PDF" link (signed URL via existing storage path) + "Replace" button; if absent → dashed "Upload PDF" dropzone that writes to the same existing bucket/column already in use.
- Canva template link surfaced as a header action button (opens external Canva URL in new tab).
- Row action button: "Open Hub" → existing preview route.
- Empty state styled to match dark theme.

## 4. Commissions (`RepCommissions.tsx`)

Same data source, restyled + relabeled:

- Three big overview cards: **Available Balance**, **Pending Validation**, **Total Lifetime Earned** (sum of all `paid` + `available`).
- Ledger table columns: **Date · Business / Shift · Type · Amount · Status**.
  - Type badge derived from `commission_type`: `shift_base` → "Base Pay", `bonus` → "Production Bonus", `recurring` → "10% Recurring", `upfront` (legacy) → "Upfront".
- Filters (status, type) restyled to dark. No query changes.

## 5. Docs & Training (`RepDocs.tsx`)

Replace the long scroll with a structured hub:

- **Resource Vault** — 3-tile grid at top:
  1. "Canva Template" — external link button.
  2. "The Local Gift Drop Script" — opens a `<Dialog>` with the pitch script and a "Copy to Clipboard" button (uses `navigator.clipboard`).
  3. "5-Minute Hub Setup Guide" — expands an inline accordion with step-by-step walkthrough (content lifted from current RepDocs body).
- **Objections & FAQs** — shadcn `<Accordion>` grouping current inline copy into: "We already ask for reviews", "My staff won't remember", "We use QR codes", plus any other objection sections currently present. Content preserved, structure only.
- Search box at top filters accordion items by text match (client-side).

## 6. Profile & Banking (`RepProfile.tsx`)

Restyle existing sub-cards (`RepPayoutCard`, `RepPayoutHistory`, `RepTaxCard`, `RepAgreementCard`, `RepDemoRequestCard`) to the shared dark card primitive. No logic changes — same upload targets, same masking behavior already implemented in `RepPayoutCard` / `RepTaxCard`. The W-9 upload continues to write to its existing private bucket via the existing edge path.

## Technical details

- New files:
  - `src/components/rep/RepShell.tsx` — layout + nav.
  - `src/components/rep/RepCard.tsx` — shared card primitive (`bg-white/[0.02] backdrop-blur-md border-white/5`).
  - `src/components/rep/StatusDot.tsx` — colored-dot indicator for pipeline status.
  - `src/components/rep/PitchScriptDialog.tsx` — copy-to-clipboard script modal.
- Renamed: `src/pages/rep/RepRestaurants.tsx` → `src/pages/rep/RepBusinesses.tsx`. Update `App.tsx` route import; route path unchanged.
- Edited: `RepHome.tsx`, `RepCommissions.tsx`, `RepDocs.tsx`, `RepProfile.tsx`, `RepTaxBanner.tsx`, `RepImpersonationOverlay.tsx` (dark restyle only), `RepPayoutCard.tsx`, `RepPayoutHistory.tsx`, `RepTaxCard.tsx`, `RepAgreementCard.tsx`, `RepDemoRequestCard.tsx` — restyle to dark tokens; no behavior change.
- Existing guards (`if (!repLoading && !adminLoading && !isSalesRep) navigate(isAdmin ? '/admin/reps' : '/')`) preserved verbatim.
- All colors applied via Tailwind arbitrary values + `white/x` opacity so no `index.css` token churn is required (kept intentionally local to the rep portal so it doesn't affect the admin theme).

## Out of scope

- No changes to `commissions` schema, RLS, or the commission-writing edge functions. If `shift_base` rows don't yet exist for a rep, the Shift Base card simply shows `$0 Available`.
- No changes to admin-side impersonation logic.
- Route paths remain the same; only labels change.
