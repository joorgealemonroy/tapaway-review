# Las Islas Marias multi-location hub at /islas

Build a premium "choose your location" master hub at `/islas`, and put all three hubs under one login — with the safeguards confirmed below.

## Pre-flight verification (already done, read-only)

Checked what actually hangs off these two profiles before touching ownership:

- **Billing:** both profiles have no Stripe customer and no Stripe subscription attached. Moving them creates no billing event and no new subscription.
- **Content:** blocks, links, analytics, and lead/VIP captures are all keyed to the profile id, not the owner login — 2 blocks / 5 links / 42 analytics rows on `/islasmarias`, 3 blocks / 5 links / 120 analytics rows on `/islasmariasog`. None of it moves or is touched.
- **Public visibility:** the public gate is `subscription_status = 'active'` OR (`trialing` AND approved). Both are `trialing` + approved with pipeline status `approved`, and none of those fields change.
- **Media:** photo and link-image buckets are publicly readable by URL, so every existing image keeps working after the owner changes. Only *future* uploads land in a new folder, which the policies allow.
- **NFC cards:** neither profile has a claimed card tied to the old login, so nothing to re-point.
- **Slugs:** untouched.
- **Rep attribution:** `sales_rep_id` / `created_by_rep_id` stay as they are, so commissions and rep history are unaffected.

Only the manage/see relationship changes.

## Ownership consolidation

- Resolve the `alexis@tapaway.co` user id by email lookup at run time (no hardcoded UUID). There is no `alexi@tapaway.co` account.
- In a single transaction: re-point both existing profiles' owner, confirm `islas` is free in the shared slug namespace (personal hubs *and* business hubs), then insert the new `/islas` profile. If the slug is taken or the email doesn't resolve, the whole thing rolls back and nothing changes.
- All three then show up in one dashboard through the existing multi-profile switcher — no dashboard changes needed.

## /islas billing posture

`/islas` is created as an included master hub for this customer: publicly visible via the approved path, no Stripe customer id, no subscription id, and no checkout or trial email triggered. Its plan tier only unlocks the feature set — it does not create or require a second paid subscription.

## The /islas page

Rendered by the same hub engine as every other TapAway hub, so it stays consistent and fast:

- Logo header with the Las Islas Marias logo on a clean brand band.
- Heading "Las Islas Marias", supporting line "Our Locations", subtitle "Choose a location to view their menu, directions, socials & more."
- A dark premium selector section with two large rounded location cards:
  - Las Islas Marias — Los Angeles (6401 San Pedro St) → `/islasmarias`
  - Las Islas Marias — Gardena (444 W Gardena Blvd) → `/islasmariasog`
- Each card: large image, business name, city line, optional one-line subtitle, clear "View Location" call to action, whole card tappable.
- No menu, directions, review, or ordering buttons here — location choice first, the existing hub handles everything else.
- Mobile-first single column; two columns side-by-side from tablet up. Subtle borders, soft shadows, press feedback, generous spacing.

## Reusable Locations block

Rather than a one-off page, add a **Locations** block type to the existing block system:

- New block type `locations` in the dashboard block picker.
- Editor: add / remove / reorder entries; each has name, city label, optional subtitle, image upload, and a destination.
- Destination handling: an internal TapAway slug navigates through React Router (no full page reload); a full external URL (`http`/`https` to another origin) renders as a normal external link with the usual safe-link handling. The editor accepts either and shows which mode an entry is in.
- Same renderer in the dashboard live preview and on the public hub.
- Adding a 3rd, 4th or 5th location later is pure data entry.

## Technical notes

- Ownership + creation run as one transactional data change: email → uuid lookup, slug availability check against `personal_profiles.username` and `restaurants.custom_slug`, owner update, profile insert, then one `personal_blocks` row of type `locations` seeded with the two locations.
- New `LocationsBlock` renderer shared by `PersonalProfilePage.tsx` (public) and `ProfilePreviewRenderer.tsx` (preview), wired into both block `switch` statements.
- New editor branch in `BlockModal.tsx` (`BLOCK_TYPES` entry + content form), reusing the existing image upload/compression path.
- Internal entries use `Link to="/:slug"`; external entries use an anchor via the existing `sanitizeUrl` guard with `rel="noopener noreferrer"`.
- Styling uses existing semantic tokens and `src/lib/hubContrast.ts`, matching the two-tone band/body treatment other hubs use.
- Location card images default to each location's existing hub imagery; better food photos can be swapped in from the dashboard afterwards.

## Out of scope

No change to `/islasmarias` or `/islasmariasog` content, design, slugs, approval state, analytics, or billing. Both stay visually and functionally identical.
