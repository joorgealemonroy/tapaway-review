# Move /lasnuevasislas onto the new dashboard

## What exists today (verified)

- `/lasnuevasislas` — "Las Nuevas Islas" (Rialto, CA), still on the **old** restaurant dashboard. Active monthly, approved, owned by `hold@tapaway.co`.
- It has: logo, phone (909) 237-9010, Google review link, Yelp link, Apple Maps directions, Instagram (`lasnuevasislas`).
- It has **no menu** stored (0 sections, 0 items), so there is nothing to import — a menu can be added later with the paste-a-menu tool.
- The same owner also has `/lasnuevasislasmv` (Moreno Valley), also on the old dashboard, also with no menu.

## What will change

Create a new Solo hub for Las Nuevas Islas and hand the public URL over to it, exactly like the Las Islas Marias migration.

1. **Build the Solo hub** under the same owner account (`hold@tapaway.co`), so it appears in that login's profile switcher alongside the other hubs.
   - Full-banner header using the existing logo, business name, and the standard theme.
   - Tiles seeded from the old hub: Google review, Apple Maps directions, Yelp, Instagram, and a call button for the phone number.
   - Save Contact card enabled with the business name, phone, and address.
2. **Review it** at a temporary slug (`lasnuevasislas-new`) so you can check it and tweak tiles from the dashboard before it goes public.
3. **Swap the URL** with the existing admin swap tool: `/lasnuevasislas` starts pointing at the new Solo hub and the old restaurant hub is parked as `lasnuevasislas-legacy`. All printed cards and QR codes at `/lasnuevasislas` keep working.
4. Menu can be added anytime afterwards from the dashboard's Menu block (paste the whole menu at once).

No other hub's URL changes.

## Open item

Do you want `/lasnuevasislasmv` (Moreno Valley) moved over in the same pass? Same owner, same setup — I can do both at once, otherwise I'll leave it on the old dashboard for now.

## Technical notes

- Insert a `personal_profiles` row (`user_id` = current owner, `plan_type` pro, `subscription_status` active, `is_approved` true, `header_type` full_banner) plus `personal_links` rows for review/directions/yelp/instagram/phone as half-width image tiles, matching the seeding used for the Islas Marias hubs.
- Slug handover uses the existing `admin_swap_hub_slug(_personal_id, _restaurant_id)` RPC — no new SQL functions.
- Menu, if added later, is a `menu` block in `personal_blocks.content` via the existing `MenuBlockEditor`; no schema change.
