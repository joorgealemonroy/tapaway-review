## Goal

When a sales partner creates a demo, drop them directly into the **exact same dashboard the Business owner will see** (draggable blocks, hero editor, design tools) — no separate rep-only form. Also fix the plan badge so rep-created demos show **"Pro Trial"** instead of **"VIP Access"**, and stop calling these accounts "Lite" in the rep-facing UI (internally they remain `personal_profiles` / `solo_pro`).

## Changes

### 1. Backend: stop auto-assigning "VIP" (founding_pro) to rep demos
Update the `assign_founding_status` trigger so it short-circuits when `sales_rep_id` or `created_by_rep_id` is set on the new row. Rep demos will instead be inserted with:
- `plan_type: 'solo_pro'`
- `subscription_status: 'trialing'`
- `trial_ends_at: now() + 7 days`

This is what drives the badge — "VIP Access" comes from `founding_pro`; "Pro Trial" comes from `solo_pro + trialing`.

### 2. `RepDemoCreate.tsx` — collapse to a single slim step, then jump into the real dashboard
- Keep the current tiny form (Business Name, Business Phone, optional Owner Email).
- Keep the 50/day cap check.
- On submit: insert one `personal_profiles` row with `sales_rep_id`, `created_by_rep_id`, `is_approved: false`, `plan_type: 'solo_pro'`, `subscription_status: 'trialing'`, `trial_ends_at: +7d`, unique username.
- Immediately `navigate('/dashboard?profile_id=<new_id>' + (admin_view_rep ? '&admin_view_rep=…' : ''))`.
- Remove Step 2 (PDF upload) from this flow — the PDF upload stays available from the Businesses pipeline row so it doesn't block the rep from customizing the hub. Copy updated to "Create & open dashboard".

### 3. `PersonalDashboard.tsx` — allow sales reps to edit rep-owned demos
- Extend the existing loader so a signed-in sales rep with `?profile_id=<id>` can load a `personal_profiles` row where `sales_rep_id = auth.uid()` (or `created_by_rep_id`), even though they aren't the `user_id` owner.
- Keep the "Partner Portal" escape-hatch button already in the top nav.
- No changes to the editor UI itself — reps use the same Links / Design / Leads / SMS / Stats / Shop / Plan / Cards dashboard the Solo owner sees.

### 4. RLS: let reps update their own demo profiles
Add a policy on `personal_profiles` (and the related `personal_links`, `personal_blocks` if not already covered) allowing `UPDATE` / `INSERT` / `SELECT` when `sales_rep_id = auth.uid()` and `is_approved = false`. Once approved and claimed by a real owner, the rep loses write access automatically.

### 5. Copy cleanup (rep-facing only)
- Rename "Business Lite demo hub" → "Business demo hub" everywhere in `RepDemoCreate`, `RepBusinesses`, `RepHome`, `RepShell` nav.
- The internal Solo dashboard keeps its own naming — nothing changes on the client side.

### 6. Admin approval queue (unchanged behavior, verified)
`AdminPendingHubApprovals` continues to list `personal_profiles` where `sales_rep_id IS NOT NULL AND is_approved = false`. Approve action still flips `is_approved = true` and keeps `plan_type = 'solo_pro'`. No "VIP" is ever assigned to these rows.

## Technical notes

- The badge fix is entirely a data problem — no UI change needed in the dashboard billing card. Once the trigger no longer stamps `founding_pro`, the existing "Pro Trial" branch renders automatically for `solo_pro + trialing`.
- Impersonation param `admin_view_rep` is preserved through the redirect so admins can watch/build a demo as the rep.
- No schema changes beyond the trigger update and one RLS policy addition.

## Out of scope

- The Canva print-PDF upload stays on the Businesses pipeline row (already implemented) — not resurrecting it as a blocking step 2.
- No changes to the client Solo dashboard code path.
