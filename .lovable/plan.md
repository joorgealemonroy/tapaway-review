## Root cause

Anonymous requests to `personal_links` return `permission denied for table personal_profiles` — not because RLS blocked the row, but because the tables in the `public` schema have **zero GRANTs** to `anon`, `authenticated`, or `service_role`. PostgREST rejects the request before RLS is even evaluated, so every visitor sees "No links yet".

The restaurant hubs and the profile fetch itself keep working only because they go through `SECURITY DEFINER` RPCs (which bypass grants). Everything the client reads directly from a table — links, blocks, analytics, lead forms — is one restart away from silently returning empty. That is why the same class of outage keeps recurring.

## Fix

### 1. Add the missing GRANTs (migration)

For every public-facing table, add explicit grants that match its RLS intent:

**Public-readable content (visitors must see it):**
- `personal_links`, `personal_blocks` — `GRANT SELECT TO anon`; full CRUD to `authenticated`; `ALL` to `service_role`.
- `personal_profiles` — `GRANT SELECT TO anon` (needed by the public policy for approved profiles); full CRUD to `authenticated`.
- `lead_forms` — `GRANT SELECT TO anon` (public visitors need to render the form on a hub); CRUD to `authenticated`.

**Public-writable (anon inserts only):**
- `personal_analytics`, `lead_submissions`, `personal_email_captures`, `nfc_card_taps`, `pending_otps`, `restaurant_sms_subscribers` — `GRANT INSERT TO anon` (RLS already scopes what they can write); CRUD to `authenticated` where owners manage rows.

**Auth-only tables** (every policy scopes to `auth.uid()` or admin): `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`, `ALL TO service_role`, **no anon grant**. Covers: `user_roles`, `personal_card_requests`, `sms_campaigns`, `bookings`, `creator_products`, `creator_availability`, `creator_purchases`, `sales_reps`, `rep_*`, `commissions`, `affiliate_*`, `admin_audit_log`, `app_settings`, `goals`, `competitors`, `coach_ignored`, `menu_sections`, `menu_items`, `analytics_events`, `restaurants`, `locations`, `google_reviews`, `review_sentiments`, `restaurant_engagement`, `av_*`, `fulfillment_orders`, `magic_link_tokens`, `promo_tokens`, `banned_words`, `pending_trials`, `support_requests`.

RLS policies are already correct — this migration only re-opens the API surface that was silently closed off.

### 2. Prevent regressions

Extend `/admin/hub-health` (added last turn) to probe **end-to-end** for a curated list of live paying customers, not just the profile RPC:
- Anonymous fetch of the profile RPC → must return 1 row.
- Anonymous `SELECT` on `personal_links` filtered by that profile id → must return `>= 1` row for hubs that have links.
- Anonymous `SELECT` on `personal_blocks` for hubs that have blocks.

If any probe returns `0` rows or a permission error, the row turns red with the exact endpoint that failed. This surfaces both missing GRANTs and RLS regressions on the first page load, not after a customer complains.

Also extend `scripts/check-public-hubs.mjs` with the same three-part probe for `rebornwraps` and `sugarbloomcakery` so CI catches this class of bug before it ships.

### 3. Verify

After the migration, run the anon `personal_links` request for `rebornwraps` and `sugarbloomcakery` and confirm 5 and 6 rows respectively (matches what's in the database today). Then reload `/rebornwraps` in the preview and confirm links render.

## Technical notes

- Not touching any RLS policies — this is grants-only.
- Not touching auto-generated `src/integrations/supabase/client.ts` or types.
- The health dashboard change is admin-only and read-only (uses the anon key from `import.meta.env` to simulate a real visitor).
