# Calendar date picker + graceful pages for expired trials

## 1. Pick a date in the admin Accounts table

Next to the existing Today / 30 days / All buttons, add a "Pick a date" button that opens a calendar popover.

- Choosing a day filters the account list to hubs created on that calendar day (local time).
- When a date is picked, the status and pipeline filters reset to "All", so every account from that day shows — trialing, active, expired, canceled, unapproved drafts included.
- The chosen day is shown as a chip with a clear (X) to return to the normal presets.
- Every row keeps the link it has today, so each hub still opens in admin preview.

The list already loads all accounts, so the day filter is applied to the rows in the browser — no extra loading.

## 2. Expired / never-handed-out trials show "claim your hub" instead of 404

Today both lightweight status lookups only return rows for approved hubs, so a trial that was never handed out falls through to the Not Found page.

- Migration: recreate both status functions with the approved-only condition removed. Everything else stays identical — same minimal public branding fields, still no links, blocks, contact details or billing data, same permissions.
- Personal hubs then reach the existing branded "Your trial ended — claim your hub" preview.
- Restaurant hubs reach the existing paused gate, which gets the same reactivate button as the personal page: it sends the owner to the Plan tab of their dashboard, or to sign-in first when signed out. No new billing flow — same upgrade path that already exists.

## 3. Verification

- Open the Accounts table, pick a past date, confirm that day's accounts (including expired trials) all appear and open.
- Confirm the migration ran cleanly.
- Open a known expired / never-handed-out slug in a signed-out browser and confirm the branded claim page renders with a working reactivate button, not the 404.

## Technical notes

- `src/components/admin/AdminUnifiedAccountsTable.tsx`: add `pickedDate` state, shadcn Popover + Calendar (`pointer-events-auto`), fold a same-day `created_at` check into the existing `filtered` memo, and force `statusFilter`/`pipelineFilter` to `all` when a date is set.
- Migration: `CREATE OR REPLACE FUNCTION public.get_public_personal_profile_status(text)` and `public.get_public_restaurant_hub_status(text, uuid)` without `is_approved = true`; keep `SECURITY DEFINER`, `SET search_path = public`, and the existing REVOKE/GRANT block.
- `src/components/hub/ExpiredHubGate.tsx`: replace the `/paywall?restaurant=` navigation with the Plan-tab CTA (`/dashboard?tab=plan`, or `/auth?redirect=...` when `supabase.auth.getUser()` reports no session), matching `ExpiredSoloHubPreview`.
- `ReviewHub.tsx` paused detection and `UsernameResolver.tsx` routing already handle these cases once the RPCs return unapproved rows; no routing change expected.
