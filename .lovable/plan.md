# Fix Las Islas Marias OG: Instagram link + menu not showing/saving

Two separate root causes, both confirmed against live data.

## 1. Menu never shows on any public hub (RLS bug)

The hub page reads menu sections/items directly from the database as an anonymous visitor. Those tables allow public reads only "if the restaurant is approved" — but that check re-reads the restaurants table, which anonymous visitors are not allowed to read (public hubs load through a secure function instead). So the inner check always fails and every visitor gets an empty menu.

Verified: as an anonymous visitor, both Las Islas Marias OG (11 sections, 81 items) and other approved hubs return zero menu sections, while the same query as admin returns the full menu. This affects every restaurant hub, not just this one.

Fix: expose the menu through a secure read function (same pattern already used for the hub itself) that returns sections + items for an approved restaurant, and have the hub page call that instead of querying the tables directly. Public table policies stay locked down.

## 2. Menu edits appear not to save

The editor deletes all sections and re-inserts them. If any insert is rejected, the menu can end up emptied with no clear message. Plan:

- Re-verify saving as the actual hub owner (owner is alexis@tapaway.co) after the read fix, since the editor re-reads through the same broken path in some views.
- Replace the destructive delete-then-insert with a safer save: insert new content first, only remove what was actually removed, and surface a visible error toast if any step fails instead of silently leaving an empty menu.
- Confirm sales-rep and admin editors can also save (owner-only rules today).

## 3. Instagram button doesn't work

Las Islas Marias OG has its Instagram stored as an app-only deep link (`instagram://user?username=Islasmariaog64`) instead of a normal web address. On desktop and on phones without the app installed, that link goes nowhere.

Fix:

- Store Instagram as a normal `https://instagram.com/<handle>` address everywhere it is saved (business settings, admin editor, onboarding), normalizing whatever the user types (handle, deep link, or full URL).
- On the hub, keep the app deep link only as a mobile enhancement with the web address as the real fallback, so the button always lands somewhere.
- Data fix: convert the existing deep-link values already stored on hubs to the web format.

## Technical notes

- New security-definer function `get_public_restaurant_menu(_restaurant_id uuid)` returning sections with nested items, gated on `is_approved = true`; grant execute to anon/authenticated.
- `src/pages/ReviewHub.tsx`: `fetchMenu` switches to the RPC; `getInstagramDeepLink` used only for `href` on touch devices, otherwise the https URL.
- `src/components/dashboard/MenuTab.tsx`: non-destructive save + error toasts; reads via the same RPC when in demo/admin view.
- `src/components/dashboard/SettingsTab.tsx`, `src/pages/Admin.tsx`, `src/pages/OnboardingNew.tsx`: normalize Instagram input to https on save.
- One-time migration to rewrite `restaurants.instagram_url` values starting with `instagram://`.
