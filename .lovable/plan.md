

# Revised Database Security Audit Migration

## Correction Applied
`SET search_path` is not valid for views in PostgreSQL — only for functions. For `restaurant_public_info`, we schema-qualify the table reference (`public.restaurants`) inside the view definition instead.

## 6 Fixes

### 1. Restaurant Data Leak
Drop `"Public can read restaurant public info"` SELECT policy on `restaurants` (uses `USING (true)`, exposes all columns). The `restaurant_public_info` security-definer view already serves safe public data.

### 2. Support Requests — SELECT cleanup only
Drop redundant `"Users can view own support requests"` (duplicate of `"Users can view their own support requests"`). **Keep** both INSERT policies (anonymous + authenticated) unchanged.

### 3. Analytics Manipulation
Drop `"Anyone can insert analytics"` (`WITH CHECK (true)`). The validated policy `"Anyone can insert valid personal analytics"` remains.

### 4. Security Definer Views

| View | Current | Fix |
|------|---------|-----|
| `personal_profiles_public` | No `security_invoker` | Recreate with `security_invoker = true` (underlying `personal_profiles` has proper RLS) |
| `rep_payout_display` | Already `security_invoker = true` | No change needed |
| `rep_tax_status` | Already `security_invoker = true` | No change needed |
| `restaurant_public_info` | No `security_invoker` (intentional — public view) | Recreate with schema-qualified `FROM public.restaurants` to prevent search-path hijacking. Keep as security definer. |

### 5. Function Search Path
`ALTER FUNCTION cleanup_expired_archives() SET search_path = public`

### 6. RLS Enabled No Policy
Only `magic_link_tokens` — intentionally service-role only. No action needed.

## SQL Migration

```sql
-- 1. Drop overly permissive restaurant SELECT
DROP POLICY IF EXISTS "Public can read restaurant public info" ON public.restaurants;

-- 2. Drop redundant support_requests SELECT
DROP POLICY IF EXISTS "Users can view own support requests" ON public.support_requests;

-- 3. Drop unvalidated analytics INSERT
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.personal_analytics;

-- 4a. Recreate personal_profiles_public with security_invoker
CREATE OR REPLACE VIEW public.personal_profiles_public
WITH (security_invoker = true)
AS SELECT id, username, full_name, headline, bio, profile_photo_url,
    header_image_url, header_type, header_color, background_color,
    pfp_position, plan_type, subscription_status, contact_enabled,
    contact_name, contact_phone, contact_email, contact_company,
    contact_title, contact_address, contact_website, contact_photo_url,
    banner_image_url, show_shop_section
FROM public.personal_profiles
WHERE subscription_status = 'active';

-- 4b. Recreate restaurant_public_info with schema-qualified table
CREATE OR REPLACE VIEW public.restaurant_public_info AS
SELECT id, restaurant_name, header_title, header_subtitle, menu_title,
    google_review_url, yelp_review_url, directions_url, instagram_url,
    logo_url, custom_slug, type, hub_background_style, custom_background_url,
    avm_question_title, avm_question_subtitle, avm_positive_label,
    avm_negative_label, phone
FROM public.restaurants;

-- 5. Fix function search path
ALTER FUNCTION public.cleanup_expired_archives() SET search_path = public;
```

## Risk Notes
- `restaurant_public_info` stays as security definer — the view only exposes safe columns and now has schema-qualified table references
- Anonymous support form INSERT preserved
- `magic_link_tokens` no-policy is intentional (service role only)
- No code changes required — all queries use these views/policies unchanged

