# Finish the /islas master hub and consolidate ownership

## What's already done
The Locations block is fully built: renderer, live preview, and the dashboard editor (title, subtitle, button label, per-location photo, name, city, subtitle, and destination that accepts either a TapAway slug or a full web address). Nothing remains on the code side.

## What's left

### 1. Make both existing hubs permanently active
`islasmariasog` has a trial end date of Aug 20, 2026 — already in the past. The dashboard auto-expires any hub whose trial date has passed the moment it's opened, so that hub could drop off the public web once alexis@tapaway.co signs in.

These are established client hubs, not trials, so instead of extending a trial they are set to a permanent active state and the stale trial end date is cleared entirely. With no trial date and an active status, the dashboard's expiration logic can never touch them again. Neither hub has a Stripe customer or subscription, so nothing is created, charged, or changed in billing.

### 2. Transfer ownership
Move `islasmarias` and `islasmariasog` to the existing alexis@tapaway.co account, in the same transaction. The account is looked up by email at run time rather than hardcoded. Verified beforehand:
- No Stripe customer or subscription on either hub — zero billing impact.
- Links, blocks, menu, analytics, and uploaded images are all keyed to the hub, not the owner — nothing moves or breaks.
- Approval state, slugs, design, and content stay exactly as they are.
- The sales-rep attribution fields stay untouched so commission history is preserved.

### 3. Create and seed /islas
A third hub owned by the same account:
- Slug `islas`, name "Las Islas Marias", approved and active so it's publicly live immediately.
- Not attached to any Stripe subscription — it's an included master hub, not a new paid plan.
- Header: the Las Islas Marias logo in the existing logo-band style, dark page body to match the family look.
- One Locations block with two premium cards: "South LA — 6401 San Pedro St" → `/islasmarias` and "Gardena — 444 W Gardena Blvd" → `/islasmariasog`, each with a photo and city line.
- No menu, directions, or location-specific actions on the master hub — one tap, pick a location, done.

### 4. Verification pass
- Confirm all three hubs appear in the same dashboard account switcher for alexis@tapaway.co.
- Re-read both existing hubs' full records and content counts before/after to prove nothing changed except ownership, the permanent active status, and the cleared trial date.
- Load `/islas` publicly (signed out) at mobile and desktop widths, screenshot both, and confirm each card routes instantly to the right hub with no page reload.
- Load `/islasmarias` and `/islasmariasog` signed out to confirm they still render identically.

## Technical notes
- Ownership transfer + trial extension + `/islas` insert run as one data migration; alexis's UUID is resolved from `auth.users` at runtime rather than hardcoded.
- `/islas` is inserted with `sales_rep_id`/`created_by_rep_id` left null so it does not enter the rep demo pipeline or trigger founding-status assignment side effects; `pipeline_status` set to `approved`.
- Public visibility relies on `get_public_personal_profile`, which requires `active`, or `trialing` + approved — the seeded record satisfies this.
- Browser verification uses Playwright against the running preview at 390px and 1440px viewports.
