

# Admin NFC Card Batch Manager

## Overview

Add a new admin page at `/admin/nfc-cards` where you can generate NFC card batches, view all cards in a table, and download CSV files for printing trifolds.

## New File: `src/pages/admin/AdminNfcCards.tsx`

A single admin page with two sections:

### Section 1: Generate Batch
- Input for **batch size** (number, default 10)
- Input for **batch ID** (optional text label, e.g. "BATCH-001" or "FEB-2026")
- "Generate Cards" button that calls `admin-create-nfc-cards`
- On success: auto-downloads the CSV and shows the newly created cards

### Section 2: All Cards Table
- Loads all cards from `nfc_cards` table on page load
- Columns: Public Code, Status, Batch ID, Owner, Destination, Created, Claimed At
- Search/filter by batch ID or public code
- Status badges (unclaimed = gray, claimed = green, disabled = red)
- Download CSV button for any batch (filters and exports)

### CSV Format (for trifold printing)
```
public_code,claim_code,nfc_url
AB12CD,Kx7mNp3Q,tapaway.co/setup
```

The `claim_code` column only appears in the CSV returned at generation time (it's never stored in plaintext). For existing cards, the CSV will only have `public_code` and status.

## Route Addition

Add `/admin/nfc-cards` route in `App.tsx` with a lazy import. Add a navigation button in the main Admin page linking to it.

## Technical Details

### Files to create
| File | Purpose |
|------|---------|
| `src/pages/admin/AdminNfcCards.tsx` | Full admin page for batch generation and card management |

### Files to modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add lazy import and route for `/admin/nfc-cards` |
| `src/pages/Admin.tsx` | Add "NFC Cards" button in the admin nav section |

### Component structure
- Uses `useAdminAccess` hook for auth guard (same pattern as other admin pages)
- Back arrow to `/admin`
- "Generate Batch" section at top with count + batch ID inputs
- Table section below using the existing `Table` UI components
- Toast notifications for success/error
- CSV download triggers browser download via `Blob` + `URL.createObjectURL`

### Data flow
- **Generate**: Calls `supabase.functions.invoke("admin-create-nfc-cards", { body: { count, batchId } })` -- returns cards with plaintext claim codes
- **List**: Queries `supabase.from("nfc_cards").select("*").order("created_at", { ascending: false })` -- admin RLS policy already grants full access
- **Download**: For freshly generated batches, uses the response CSV directly. For historical batches, exports public_code + status only (claim codes are gone)

