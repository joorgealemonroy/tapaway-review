
# Account Cleanup & Restaurant Consolidation (v2)

Data-only cleanup. No schema, RLS, or code changes. Each destructive step runs via `supabase--insert` so you review exact SQL before it executes.

---

## Part A — Delete abandoned Business (legacy) restaurants

| Slug / Name | Restaurant row | Auth user |
|---|---|---|
| `yh-corporate-finance` | Delete | Delete (no other assets) |
| `fuego-silvestre` | Delete | Delete (no other assets) |
| `avmealpreps` (AV Meal Prep) | Delete row only | **Keep** — same auth user also owns `TapAway` restaurant (out of scope) |
| 3× "My Restaurant" (`fe892e82…`, `31e9c4ef…`, `02b6cdf3…`) | Delete | Delete each (no other assets) |

Cascade order per restaurant: `menu_items` → `menu_sections` → `google_reviews` → `review_sentiments` → `competitors` → `goals` → `restaurant_sms_subscribers` → `restaurant_sms_campaigns` → `restaurant_engagement` → `locations` → `analytics_events` → `nfc_cards` (unclaim, not delete) → `restaurants`. Auth deletion goes through the existing `delete-user-complete` edge function for a single audited path.

## Part B — Delete abandoned Business Lite (personal) accounts

For each: delete `personal_blocks` → `personal_links` → `personal_analytics` → `lead_forms` → `personal_profiles`, then `delete-user-complete` for the auth user.

Accounts: `jeff`, `julio`, `jor`, `manuel`, `trepif`, `oxydgo`, `adrianlasislas`, `tapjdarko`, `killo` (you wrote "kilo"), `vanco`, `holyvista`, `ricardo`, `jaden`, `tresaimccarver`.

Special cases:
- **`soniamonroy`** — delete `personal_profiles` row only. Auth user `875c4312…` (`semr13@me.com`) is kept: owns `lasislasmarias` and is a grandfathered founder.
- **`adrianlasislas`** — unclaim NFC card `31710841-0d9d-4e2d-860d-5b3667a6fda6` **before** deleting profile/auth, using your exact approach:

  ```sql
  BEGIN;
  ALTER TABLE nfc_cards DISABLE TRIGGER prevent_card_reclaim;
  UPDATE nfc_cards
     SET status = 'unclaimed', owner_user_id = NULL, restaurant_id = NULL
   WHERE id = '31710841-0d9d-4e2d-860d-5b3667a6fda6';
  ALTER TABLE nfc_cards ENABLE TRIGGER prevent_card_reclaim;
  COMMIT;
  ```

## Part C — Consolidate ownership

Reassign `restaurants.owner_id` only. No deletions.

1. **Oregon Las Islas trio** — `lasislasportland`, `lasislaswoodburn`, `lasislassalem` already share owner `98fe0170…` (`islasfbaproducts@gmail.com`). **No-op**.
2. **Fontana + Marias** — set `lasislasfontana` and `lasislasmarias` to `owner_id = 875c4312-7f6c-46cb-ba69-86d1becd7d65` (Sonia). Previous `lasislasfontana` owner (`soniamariscos@gmail.com`) auth user is kept — no data loss, just no longer owns a restaurant.
3. **Las Nuevas Islas trio** — target `lasnuevasislas@gmail.com` does not currently exist as an auth user. Plan will:
   - Provision the user via Supabase Admin API (edge function `admin-create-user` if present, otherwise a one-off call). A magic-link is emailed on first login attempt; no password is set here.
   - Reassign `lasnuevasislas`, `lasnuevasislasfontana`, `lasnuevasislasmv` to that new user_id.
   - Leave placeholder holders (`hold@`, `holder1@`, `holder2@tapaway.co`) untouched.

## Part D — Safety rails

- Each account processed inside its own transaction; failure rolls back that account only.
- Hard-guard list excluded from any auth deletion: `tap@tapaway.co`, `semr13@me.com`, `islasfbaproducts@gmail.com`, `alexis@tapaway.co`, `placeholder@gmail.com`, plus all `tester*@tapaway.co`.
- Stripe subscriptions on deleted accounts are **not** auto-cancelled — recommend cancelling in Stripe, or say the word and I'll add a follow-up step that invokes `cancel-subscription` for each affected `stripe_customer_id`.
- Every destructive op writes an `admin_audit_log` row (`action='cleanup_delete_account'`, target id + email) for regulatory traceability.

## Execution order

1. Part C.1 confirm no-op.
2. Part C.2 Fontana/Marias reassignment.
3. Provision `lasnuevasislas@gmail.com`, then Part C.3 reassignment.
4. Part A restaurant purges (with TapAway carve-out).
5. Part B personal purges (with Sonia carve-out + Adrian card unclaim block above).
6. Emit summary: rows deleted, rows reassigned, guard-list skips.

**Out of scope:** schema/RLS changes, edge function code changes, Stripe cancellations, UI changes.
