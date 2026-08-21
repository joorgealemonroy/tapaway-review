# Move all 3 Las Nuevas Islas hubs onto the new Solo dashboard

## What exists today (verified)

All three are still on the **old** restaurant dashboard, all active and approved, and all already owned by the same account (`hold@tapaway.co`):

| URL | Location | Phone |
| --- | --- | --- |
| `/lasnuevasislas` | Rialto | (909) 237-9010 |
| `/lasnuevasislasmv` | Moreno Valley | (951) 242-5200 |
| `/lasnuevasislasfontana` | Fontana | (909) 320-8572 |

Each has a logo, Google review link, Yelp link, Apple Maps directions, and Instagram. **None of them has a menu stored** (0 sections, 0 items), so there is no menu to import — menus can be added later with the paste-a-menu tool.

## Execution steps

1. **Unified ownership** — create three Solo hubs, all attached to `hold@tapaway.co`, so the owner switches between Rialto, Moreno Valley, and Fontana in the dashboard profile switcher.
2. **Data seeding** — each hub gets its own logo, business name, phone, and tiles for Google review, Apple Maps directions, Yelp, and Instagram, with the full-banner header and standard theme.
3. **Staging** — build them at temporary slugs `lasnuevasislas-new`, `lasnuevasislasmv-new`, `lasnuevasislasfontana-new` so you can review and tweak each one from the dashboard before anything goes public.
4. **Zero-downtime swap** — run the admin swap on all three; each public URL starts pointing at its new Solo hub.
5. **Legacy parking** — the old restaurant hubs move to `lasnuevasislas-legacy`, `lasnuevasislasmv-legacy`, `lasnuevasislasfontana-legacy`. Every NFC stand and QR code in the field keeps working and lands on the new hub — no broken links.

No other hub's URL changes.

## Technical notes

- Insert three `personal_profiles` rows (`user_id` = `3db09cf6-a9d4-4edb-9514-8e7e55fb3b79`, `plan_type` pro, `subscription_status` active, `is_approved` true, `header_type` full_banner) plus `personal_links` rows per hub for google_review / directions / yelp / instagram / phone, seeded as half-width image tiles like the Islas Marias hubs.
- Slug handover uses the existing `admin_swap_hub_slug(_personal_id, _restaurant_id)` RPC once per pair — it renames the restaurant to `<slug>-legacy` and moves the slug onto the Solo profile in one transaction. No new SQL functions.
- Menus, if added later, are `menu` blocks in `personal_blocks.content` via the existing `MenuBlockEditor`; no schema change.
