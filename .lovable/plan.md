# Ultimate Security Audit Remediation

A single Supabase migration that locks down storage, views, policies, and function execution across the current schema. Below is the verified inventory (from live DB reads) plus the exact remediation for each item.

---

## 1. Storage policies (`storage.objects`)

**Verified issues:**
- `Authenticated users can delete link images` and `Authenticated users can update link images` on bucket `personal-link-images` — any signed-in user can modify/delete any other user's images (`USING auth.role() = 'authenticated'`).
- `personal-photos` has an UPDATE policy scoped to owner folder, but no DELETE policy for owners at all.
- Public SELECT policies on `personal-photos`, `personal-link-images`, `restaurant-logos` allow bucket listing (they match on `bucket_id` only, so `list()` succeeds).

**Fix:**
- Drop the two permissive `personal-link-images` policies. Recreate as owner-folder policies: `(storage.foldername(name))[1] = auth.uid()::text`, plus admin/rep override via `is_admin()` and an `EXISTS` on `personal_profiles` for the owning rep.
- Add owner + admin DELETE policy on `personal-photos`.
- Replace the three public SELECT policies to also require `name IS NOT NULL` (blocks list-root) and switch role from `public` to `anon, authenticated`. Direct object reads still work; `list('')` no longer returns rows.

## 2. Public-schema RLS

**Verified `USING (true)` / open policies (14 total):**
`app_settings`, `affiliate_settings`, `av_meal_prep_testimonials`, `creator_availability`, `menu_items`, `menu_sections` (SELECT true), plus INSERT-open policies on `bookings`, `lead_submissions`, `nfc_card_taps`, `pending_trials`, `personal_email_captures`, `rep_applications`, `restaurant_sms_subscribers`, `support_requests`.

**Fix:**
- **`app_settings`**: drop `Anyone can read app_settings` and `Authenticated users can read app_settings`. Recreate a single SELECT policy `TO anon, authenticated USING (true)` (intentionally public, but not `public` role which includes every login-less internal role).
- **`affiliate_settings`, `av_meal_prep_testimonials`, `creator_availability`, `menu_items`, `menu_sections`**: rewrite SELECT `TO anon, authenticated USING (true)` (retain intentional public read for hub rendering).
- **INSERT-open tables**: keep public insert (needed for public forms/analytics) but scope role `TO anon, authenticated` and add `WITH CHECK` that constrains inserts to the row shape the app actually posts (e.g. `nfc_card_taps` requires `card_id IS NOT NULL`; `lead_submissions` requires `form_id IS NOT NULL AND profile_id IS NOT NULL`; `restaurant_sms_subscribers` requires `restaurant_id IS NOT NULL AND phone IS NOT NULL`). Prevents junk-row spam via anon key.

## 3. RLS-enabled but no policies (default-deny)

**Verified:** `magic_link_tokens` — RLS on, zero policies.

**Fix:** Add an explicit deny policy commented as intentional (used only by edge functions via service role, which bypasses RLS). Keeps the linter quiet and documents intent:
```
CREATE POLICY "No direct client access" ON public.magic_link_tokens
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
```

## 4. Views — SECURITY DEFINER / INVOKER

**Verified (`security_invoker` reloption):**
- `nfc_cards_public` — invoker flag = false (definer behavior)
- `bookings_public` — invoker flag = false
- `personal_profiles_public` — no reloption set (definer default)
- `rep_tax_status`, `restaurant_public_info`, `rep_payout_display` — already invoker

**Fix:** `ALTER VIEW ... SET (security_invoker = true)` on the three definer views. Then confirm their underlying tables have SELECT policies that satisfy the actual public read paths — `nfc_cards`, `bookings`, `personal_profiles` all already have public/anon SELECT policies for the columns the views expose.

## 5. SECURITY DEFINER function grants

**Verified:** 26 functions are SECURITY DEFINER. Most are trigger functions (execute grants are irrelevant — triggers fire under table owner). Callable helpers exposed to clients via PostgREST are the risk surface.

**Fix — revoke EXECUTE from `PUBLIC` on all 26, then re-grant precisely:**

| Function | Grant to |
| --- | --- |
| `has_role`, `is_admin`, `is_affiliate`, `is_sales_rep`, `is_test_account`, `current_user_email`, `personal_profile_is_active`, `profile_has_active_card`, `is_clean_greeting`, `is_google_review_url_valid`, `build_google_review_url` | `authenticated`, `service_role` |
| `is_username_available`, `get_founding_count`, `get_public_restaurant_hub` | `anon`, `authenticated`, `service_role` (public onboarding/hub) |
| `get_signup_dropoff_stats`, `get_auth_user_by_email` | `service_role` only (admin-gated inside; still tighten call surface) |
| All trigger functions (`assign_founding_status`, `check_and_create_bonus`, `cleanup_expired_archives`, `cleanup_expired_otps`, `prevent_card_reclaim`, `set_default_greeting_name`, `sync_google_review_url`, `update_updated_at_column`, `validate_event_type`, `validate_promo_discount_type`) | `service_role` only |

All functions already have `SET search_path = public` and `auth.uid()` gating where relevant — no body changes needed.

---

## Verification after apply

- Re-run `supabase--linter`; expect prior findings cleared.
- Manual smoke: public hub load (`/@las-nuevas-islas`), rep dashboard save, magic-link auth, admin approval queue.
- Regression script: `bun run check:hubs`.

## Rollout

Single migration file. No app code changes required — all changes are policy/view/grant level and preserve existing read paths. Reversible by re-granting `EXECUTE ... TO public` and restoring the dropped policies if anything breaks.
