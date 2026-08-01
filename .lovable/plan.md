## Goal

Add two new Terms of Service clauses (public demo data / 14-day takedown, and subscriber logo + hardware marketing license) and show a subtle takedown note on public demo hubs that haven't converted to a paid plan.

## 1. Terms of Service (`src/pages/Terms.tsx`)

The page currently runs sections 1–32, ending with "32. Contact". Insert two new sections and renumber the tail so numbering stays sequential:

- **Public Business Data & Demo Hubs (Takedown Policy)** — placed near the physical/product and IP sections. Copy states: demo hub content is sourced from publicly available internet resources; TapAway claims no affiliation, endorsement, or trademark ownership over prospective businesses during the demo/trial phase; an authorized representative may request removal in writing to support@tapaway.co; TapAway removes verified requests within 14 calendar days.
- **Subscriber Logo & Promotional Media License** — active and former paid subscribers (software plan or hardware purchase) grant a perpetual, worldwide, non-exclusive, royalty-free license to use, reproduce, display, and photograph their name, logo, trademarks, and TapAway-branded hardware across TapAway's site, marketing, social, and sales collateral; no approval right over finished assets; release of liability.

Both rendered as normal JSX in the existing section/h2 pattern — no raw HTML. The "Last updated" date at the top gets bumped.

## 2. Unclaimed demo hub disclaimer

A hub counts as an unclaimed demo when it was created by a sales partner and has not converted to paid — i.e. `created_by_rep_id` is set and `subscription_status` is `trialing`. Today the public fetch (`src/pages/UsernameResolver.tsx` column list, plus the equivalent read in `src/hooks/useProfileData.ts` / the public hub RPC path) does not select `created_by_rep_id`, so that field must be added to the public column selection before the UI can branch on it. If the public path goes through a SECURITY DEFINER RPC that pins its own column list, that RPC gets a migration to return the extra field.

Then, in the public profile footer (`src/pages/personal/PersonalProfilePage.tsx`, the existing `<footer>` block) and the restaurant hub equivalent, render a small muted line only for those hubs:

> Demo profile built using publicly available business information. To claim or request removal within 14 days, contact support@tapaway.co.

Styled with the existing `isDarkBg` muted-text pattern (`text-white/40` / `text-gray-400`), with support@tapaway.co as a `mailto:` link. Nothing shown for claimed/paid hubs.

## 3. Verification

- `tsgo` typecheck.
- Playwright pass: load `/terms` and confirm both new sections render with correct numbering; load one paid hub (no note) and one rep-built trialing hub (note present); check console is clean.

## Technical notes

- Terms change is copy-only.
- The only possible backend change is widening the public profile read to include `created_by_rep_id`; no RLS or policy changes, and no new tables.
