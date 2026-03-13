

# Ensure All Restaurant Hubs Are Publicly Accessible

## Problem

The `UsernameResolver` was already fixed to use the public `restaurant_public_info` view. However, `ReviewHub.tsx` still has a second fetch path — `fetchRestaurant()` (line 113) — that queries the RLS-protected `restaurants` table directly. This path is used when accessing hubs via `/hub/:restaurantId`.

Any unauthenticated visitor hitting `/hub/:restaurantId` will get a blank/broken page because the `restaurants` table blocks anonymous reads.

## Fix

**File: `src/pages/ReviewHub.tsx`** — Change `fetchRestaurant` (line 113-128) to query `restaurant_public_info` instead of `restaurants`.

```typescript
const fetchRestaurant = async (id: string) => {
  const { data } = await supabase
    .from("restaurant_public_info")  // was "restaurants"
    .select("*")
    .eq("id", id)
    .single();
  // ... rest unchanged
};
```

This is a one-line table name change. Both fetch paths (`fetchRestaurantBySlug` and `fetchRestaurant`) will then use the publicly accessible view, ensuring all hub URLs work for unauthenticated visitors.

