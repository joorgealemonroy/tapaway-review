

# Signup Drop-off Monitoring: Admin Dashboard Component (Revised)

## Changes

### 1. Database migration — `get_signup_dropoff_stats`

Secure `plpgsql` function with explicit admin check:

```sql
CREATE OR REPLACE FUNCTION public.get_signup_dropoff_stats(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total', COUNT(*),
    'verified', COUNT(*) FILTER (WHERE verified_at IS NOT NULL),
    'abandoned', COUNT(*) FILTER (WHERE verified_at IS NULL),
    'abandoned_list', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT email, created_at
        FROM pending_otps
        WHERE verified_at IS NULL
          AND created_at > now() - (days_back || ' days')::interval
        ORDER BY created_at DESC
        LIMIT 20
      ) t
    )
  ) INTO result
  FROM pending_otps
  WHERE created_at > now() - (days_back || ' days')::interval;

  RETURN result;
END;
$$;
```

### 2. `src/components/admin/SignupDropoffCard.tsx` (new)

Compact card showing:
- Total OTPs sent vs verified (conversion %)
- Color indicator: green < 5% drop-off, yellow < 15%, red >= 15%
- List of up to 20 most recent abandoned emails with timestamps
- 7 / 30 / 90 day filter toggle

Calls `supabase.rpc('get_signup_dropoff_stats', { days_back })`.

### 3. `src/pages/Admin.tsx`

Import and render `<SignupDropoffCard />` near the top of the admin page.

## Files changed

| File | Change |
|------|--------|
| **Migration** | Create `get_signup_dropoff_stats` with `is_admin()` guard |
| `src/components/admin/SignupDropoffCard.tsx` | New component |
| `src/pages/Admin.tsx` | Add the card |

