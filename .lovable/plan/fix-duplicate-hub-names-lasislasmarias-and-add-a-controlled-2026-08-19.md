# Fix duplicate hub names (lasislasmarias) and add a controlled swap tool

## What's happening

The slug `lasislasmarias` now exists twice:

- Live business hub (Restaurants side), approved and public since Dec 2025.
- A sales-rep demo hub (Solo/Business Lite side) created Aug 13, still unapproved, with messy info.

The availability check when a rep picks a username only looks at personal hubs — it never
checks business hub slugs. So a rep can take a slug that a live business hub already owns.
Because the public router matches personal hubs before business hubs, approving that demo
would silently hijack the live restaurant's URL.

## Plan

### 1. Stop duplicates at the source
Extend the username availability check so it also rejects any slug already used by a business
hub (and keeps the existing tap-prefix collision rules). Every place that validates a username
uses this one check — rep demo creation, signup identity step, claim step, and the dashboard
hero editor — so all of them get fixed at once.

### 2. Separate the rep's demo
Rename the rep-created demo to a distinct slug (proposed: `lasislasmarias-new`) so it can no
longer collide with the live hub. Nothing public changes: that demo is still unapproved and not
visible. The rep can keep cleaning up its info under the new slug.

### 3. Add an explicit "swap" option for later
New admin action on the hub row: **Swap slug with business hub**. When you're happy with the new
dashboard, one click will:

- Move the old business hub off the slug (park it as `lasislasmarias-legacy`) and keep it intact.
- Give the clean slug to the new personal hub.
- Log the change in the admin audit log.

It only appears when the two hubs are an exact slug pair, and it asks for confirmation first,
so it can never happen by accident. Existing NFC cards pointing at `/lasislasmarias` keep working
and land on the new hub after the swap.

## Technical notes

- Migration: update `public.is_username_available` to also check `restaurants.custom_slug`;
  add `public.admin_swap_hub_slug(_personal_id uuid, _restaurant_id uuid)` (SECURITY DEFINER,
  admin-gated, writes to `admin_audit_log`).
- Data fix for `10daa77a-1af5-4486-9d1b-4b33d67bdb87` → `username = 'lasislasmarias-new'`.
- UI: swap button + confirm dialog in the admin accounts table / hub drawer, calling the RPC.
- No change to `UsernameResolver` ordering; resolution stays personal-first, which is what the
  swap relies on.
