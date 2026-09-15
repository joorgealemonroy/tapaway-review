# Muse AI Secure Bridge

## Goal
Give Muse AI a REST API into your Lovable Cloud backend without exposing the service role key. Muse AI will authenticate with a dedicated API key and only access the tables/columns it needs.

## What will be built

1. **New Supabase Edge Function: `muse-ai-bridge`**
   - Authenticates requests via a `MUSE_AI_API_KEY` secret (sent in an `X-API-Key` header).
   - Returns `401` for missing/invalid keys; never exposes Supabase credentials.

2. **Read endpoints** — `GET /muse-ai-bridge/tables/{table}`
   - Allowed tables only: `restaurants`, `google_reviews`, `google_review_snapshots`, `analytics_events`, `personal_profiles`, `pending_trials`, `trial_nurture_log`, `support_requests`, `lead_forms`, `lead_submissions`, `email_sends`, `fulfillment_orders`, `admin_audit_log`.
   - Supports safe query params: `limit` (max 1,000), `eq:` filters (e.g. `eq:restaurant_id=...`), and `order`.
   - Returns arrays of full rows from those tables.

3. **Update endpoint** — `POST /muse-ai-bridge/restaurants/{id}`
   - Only accepts updates to three fields:
     - `stripe_customer_id`
     - `stripe_subscription_id`
     - `google_place_id`
   - Validates UUID/string shapes; returns `400` for anything else.
   - Logs each update to `admin_audit_log`.

4. **Create endpoint** — `POST /muse-ai-bridge/restaurants`
   - Creates a restaurant row for in-person closes where no signup flow ran and no row exists yet.
   - Accepts `restaurant_name` (required), `email`, `phone` plus the same three whitelisted fields (`stripe_customer_id`, `stripe_subscription_id`, `google_place_id`).
   - Generates a unique slug automatically; leaves all other columns at their defaults so the row behaves like a pre-onboarding placeholder.
   - Logs each creation to `admin_audit_log`.

4. **Secrets**
   - Add `MUSE_AI_API_KEY` as a Supabase secret (auto-generated, long random key).
   - This key is what Muse AI sends on every request.

5. **Deploy & verify**
   - Deploy the function.
   - Test a read call and a restaurant update call using `supabase--curl_edge_functions`.

## Out of scope for this plan
- No direct Postgres connection string.
- No write access to tables other than `restaurants`.
- No access to `auth.users`, storage, billing amounts, or any columns not listed above.

## Next step after approval
Create the edge function, add the secret, deploy, and run a test request against each endpoint.