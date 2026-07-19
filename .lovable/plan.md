## Deep End-to-End QA of Sales Partner Flow

Run a full black-box test of the rep pipeline, from public application through demo hub creation, catching any breakage, RLS gap, or copy/logic mismatch. No production code changes in this pass — only a written report + a follow-up fix plan.

### Scope (in order)

1. **Public application** (`/rep/apply`)
   - Submit a fresh application via the UI (headless Playwright).
   - Verify row lands in `rep_applications` with `status='pending'`.
   - Confirm duplicate email path returns the friendly toast.
   - Confirm anon RLS allows insert but blocks read.

2. **Admin approval → invite email**
   - As admin, approve the application in `/admin/reps`.
   - Verify `create-rep-onboarding` edge function fires, creates a `sales_reps` row, sets default `solo_pro` plan, and dispatches the setup email through Lovable auth email hook.
   - Check `email_send_log` for the dispatched invite, DNS/queue health via `email_domain--check_email_domain_status`.

3. **Password setup**
   - Open the setup link (`/rep/setup-password?token=…`), validate token check, set a password, and confirm the user is logged in as the rep.
   - Confirm `rep_setup_tokens` is consumed and cannot be reused.

4. **Rep profile save**
   - On `/rep/profile`, edit name/phone, save banking (`rep_payout_accounts`), upload W-9 to `rep-tax-docs`, and confirm files land in the private bucket under `auth.uid()/…`.
   - Verify storage RLS strictly blocks a second rep from reading the first rep's folder.

5. **Businesses + Demo Hub creation**
   - From `/rep/restaurants`, add a business.
   - From `/rep/demo/new`, create a demo: fill Links / Design / Leads tabs, upload a banner + a social image, submit.
   - Confirm `restaurants` row is created with `is_approved=false`, correct rep linkage in `rep_restaurants`, colors/theme persisted, and the assets land under the rep's uid prefix in `restaurant-logos`.
   - Attempt to exceed the 50/day cap and confirm the server-side block trips.

6. **Approval gate + public hub render**
   - Approve the demo from `/admin/demo-requests` (Approve Hub).
   - Visit the public `ReviewHub` URL: confirm banner, colors, deep-linked socials, and tile grid render.

7. **Admin impersonation**
   - Use "View as Rep" from `/admin/reps` and navigate through Home → Businesses → Commissions → Docs → Profile to confirm the `admin_view_rep` param stays sticky (regression from earlier fix).

### How the test runs

- Playwright driven via shell against `http://localhost:8080`, using the injected admin Supabase session for admin steps and freshly created accounts for the rep steps.
- Screenshots saved under `/tmp/browser/rep-qa/` at each checkpoint.
- Backend state verified in parallel with `supabase--read_query` (row counts, RLS behavior, email_send_log rows).
- Edge functions exercised directly with `supabase--curl_edge_functions` where the UI path is slow or opaque.

### Deliverable

A pass/fail table for each of the 7 scopes above, screenshots for anything visibly wrong, and a **prioritized bug list** grouped by severity (blocker / high / polish). No source files are edited in this pass — after you review the report, I'll implement the fixes as a follow-up.

### Assumptions to confirm

- I can create a throwaway rep account (I'll use a `+qa` email alias on your admin email so invite emails route back to you).
- OK to leave test rows in `rep_applications`, `sales_reps`, `restaurants`, `rep_restaurants` — I'll tag them with a `qa-` prefix and clean them up at the end.
