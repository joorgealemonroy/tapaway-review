

# Fix: Restaurant Hubs Showing 404 for Unauthenticated Visitors

## Root Cause

The `UsernameResolver` queries the `restaurants` table directly to check if a slug is a restaurant:

```typescript
const { data: restaurant } = await supabase
  .from("restaurants")
  .select("id")
  .eq("custom_slug", lowerSlug)
  .maybeSingle();
```

The `restaurants` table has RLS policies that **block unauthenticated users** from reading. So for any visitor not logged in, this query silently returns `null`, and the resolver falls through to "not found" — showing the 404 page.

Meanwhile, the `ReviewHub` component itself correctly uses the `restaurant_public_info` view (which is publicly accessible). The problem is just in the resolver's lookup step.

This affects **all** restaurant hubs accessed via `/:slug` by unauthenticated visitors, not just `/lasislasfontana`.

## Fix

**File: `src/pages/UsernameResolver.tsx`** (2 changes, lines 50-54 and 75-79)

Change both restaurant lookups from:
```typescript
.from("restaurants")
```
to:
```typescript
.from("restaurant_public_info")
```

This is a two-line change that fixes the issue for all restaurant slugs globally.

