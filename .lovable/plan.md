## Goal

Pressing **New Demo Hub** in the sales partner portal should skip the intake form and drop the rep straight into the real Business dashboard for a freshly-created demo profile — the same editor the owner will use. Business name, phone, and other details are edited later from inside that dashboard, exactly like a real owner does.

## Changes

### 1. `RepDemoCreate.tsx` → auto-create then redirect (no form)
Replace the current Step 1 UI with a tiny "Spinning up your demo…" state that runs immediately on mount:

- Enforce the existing 50/day cap. If hit → toast + redirect back to `/rep/restaurants`.
- Generate a unique placeholder username (e.g. `demo-<random>`; retried against `is_username_available`).
- Insert one `personal_profiles` row with:
  - `user_id: rep.user.id`
  - `full_name: "Untitled Demo"` (rep renames it in the dashboard)
  - `email: <username>@demo.tapaway.local` placeholder
  - `plan_type: 'solo_pro'`, `subscription_status: 'trialing'`, `trial_ends_at: now()+7d`
  - `sales_rep_id`, `created_by_rep_id`, `is_approved: false`, `pipeline_status: 'draft'`
  - default header/background tokens
- `navigate('/dashboard?profile_id=<new_id>')` (preserving `admin_view_rep` when present).
- No form fields, no "Create & Continue" button, no Step 1/Step 2 chrome.

### 2. New pipeline entry point
Add a **"+ New Demo Hub"** button on `RepBusinesses.tsx` and `RepHome.tsx` that routes to `/rep/demo/new` — same route, but now that route just spawns the profile and redirects. Rename any lingering "Step 1 · basic info" copy.

### 3. Business name / phone editing in the real dashboard
The Solo dashboard's existing hero/profile editor already handles `full_name` (business name) and `contact_phone`. No new UI needed — the rep sets these on the dashboard itself, matching what a real owner does. Nothing to build here; just verify the fields are exposed in `DashboardHeroEditor` / profile settings (they already are).

### 4. Pipeline list still works
`RepBusinesses.tsx` pipeline already reads `personal_profiles` where `sales_rep_id = rep.id`. Newly-spawned drafts appear immediately with `full_name = "Untitled Demo"` until the rep edits it inside the dashboard. No query changes.

## Technical notes

- The existing RLS policies (added last turn) already let the rep read/update the new profile plus its links/blocks while `is_approved = false`.
- The `assign_founding_status` trigger already short-circuits for rep-created rows, so the badge shows **Pro Trial**, not VIP.
- The auto-create runs once per mount, guarded by a ref so React StrictMode double-invocation doesn't create two profiles.

## Out of scope

- Any changes to the client Solo dashboard UI.
- Rewriting the pipeline table view.
- Admin approval queue (unchanged).
