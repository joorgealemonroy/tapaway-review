## What I verified
- The hosted backend is healthy; this is not an infrastructure outage.
- Public personal hubs are still available through `personal_profiles_public`.
- Restaurant hubs exist in the database, including `islasmarias` and `lasislasmarias`, but the public restaurant view uses `security_invoker=true`, so anonymous visitors only see rows allowed by the base table’s public rules.
- Most restaurant rows are not marked as demo accounts, and the current public rule only exposes demo restaurants. That explains why restaurant slugs like `/islasmarias` and `/lasislasmarias` are returning 404 even though the rows exist.

## Plan
1. **Restore restaurant hub visibility immediately**
   - Add a narrow public-read rule for approved restaurant hubs only.
   - Keep admin/owner/rep editing rules unchanged.
   - Do not expose unapproved restaurants.

2. **Make approved trial Business demos public-safe**
   - Confirm the personal hub public view continues to show `active` hubs and approved `trialing` hubs only.
   - Preserve admin-only preview for unapproved hubs.

3. **Add a regression safety net**
   - Add a small hub-resolution guard/test utility that checks representative slugs for both hub systems:
     - personal approved active hub
     - personal approved trial demo
     - restaurant approved hub
     - unapproved hub remains hidden publicly
   - This prevents future changes to approval gates, views, or RLS from silently taking hubs down.

4. **Verify live behavior after the fix**
   - Check database-level visibility as an anonymous visitor.
   - Verify `/islasmarias`, `/lasislasmarias`, and `/las-nuevas-islas` resolve correctly.
   - Confirm an unapproved draft still does not become public.

## Technical details
- The likely fix is a database migration on `public.restaurants`, not a frontend routing change.
- The policy should allow public viewing only when `is_approved = true` and `custom_slug` is present, rather than relying on `is_demo_account = true`.
- This keeps the `restaurant_public_info` view secured through the base table while restoring approved hub access.