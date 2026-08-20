# Menus on the new dashboard + merge both Las Islas Marias hubs

## What exists today (verified)

- `/islasmarias` — "Las Islas Marias OG" (Los Angeles), live on the **old** restaurant dashboard, with a full menu (12 sections, 83 items), Google review link, Yelp, Apple Maps directions, Instagram, logo, phone.
- `lasislasmarias-new` — the sales-rep **draft** on the new Solo dashboard (unapproved, trialing). This becomes the Gardena location.
- `/lasislasmarias` — a third, separate location (Fontana), untouched by this work.
- The new Solo dashboard has no menu feature at all. Its content items are free-form blocks, so a menu can be added as a new block type without new tables.

## 1. Menu feature for all Solo hubs

New **Menu** item you can add from the dashboard's content editor, same place as links and other tiles.

- Structured: named sections, each with items (name, optional description, price).
- Drag to reorder sections and items; hide/show individual items.
- **Fast entry**: a "Paste whole menu" box — paste your menu as text and it splits into sections and items automatically, editable afterward. This is the "all at once" path instead of typing one item at a time.
- **Import from an existing hub**: for accounts that already have a menu on the old restaurant dashboard, one button pulls it in completely.
- On the public hub: a Menu tile that opens a clean full-screen menu, styled with the hub's existing theme (matches the current full-banner look).
- Saving is non-destructive — nothing is deleted until the new version is stored, so a failed save can never blank a menu.

## 2. Merge both restaurants onto the new dashboard

Both locations end up as Solo hubs on the new dashboard, under one login, switchable with the existing profile switcher.

**Gardena (the draft)**
- Rename `lasislasmarias-new` to `islasmariasgardena`.
- Load its menu via the paste/import tool, then it goes through the normal admin approval so it goes live.

**Los Angeles (`/islasmarias`)**
- Create a matching Solo hub and copy everything over: name, logo, banner, phone, Google review link, Yelp, Apple Maps directions, Instagram, and the full 12-section / 83-item menu.
- Once it looks right, use the existing admin swap tool so `/islasmarias` points at the new hub and the old restaurant hub is parked as `islasmarias-legacy`. Existing cards and QR codes at `/islasmarias` keep working and land on the new hub.

No public URL changes for the Fontana hub.

## Open item

Which email should own both hubs? I need one login to attach both profiles to (the two current hubs sit on different accounts). Tell me the owner's email and I'll wire both to it; otherwise I'll attach both to the account that currently owns `/islasmarias` and you can hand over credentials.

## Technical notes

- New block type `menu` in `personal_blocks.content` (`{ title, sections: [{ name, items: [{ name, description, price, hidden }] }] }`). No schema change needed — content is JSON and there is no type constraint.
- Editor: new `MenuBlockEditor` used by `DashboardUnifiedContent.tsx`; renderer case in `ProfilePreviewRenderer.tsx` and the public profile page.
- Import path reads the old menu through the existing `get_public_restaurant_menu` RPC (plus an owner/admin read for unapproved hubs) and writes it into the block.
- Data work: rename draft username; insert the copied Solo profile + links/blocks for the LA hub; then call `admin_swap_hub_slug` for the slug handover.
