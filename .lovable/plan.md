

# Change Founding Counter to Use Total Personal Accounts

The `get_founding_count()` database function currently counts only `is_founding_user = true` rows. It should count **all** `personal_profiles` rows instead, so the banner/counter reflects total signups against the 1,000 cap.

## Change

One database migration to replace the function:

```sql
CREATE OR REPLACE FUNCTION public.get_founding_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.personal_profiles;
$$;
```

No frontend changes needed — `FoundingBanner` and `FoundingCounter` already use this RPC and do `1000 - count` / `count / 1000` math.

