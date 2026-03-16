

# Remove "Create Your Digital Card Free" Popup from Personal Landing Page

The `<FreeTrialPopup />` is on **`src/pages/Personal.tsx`** (line 112), with its import on line 11. This is where the popup actually appears.

**Note:** The previous removal from `Index.tsx` may have been unnecessary since the popup's `EXCLUDED_PATHS` logic and the business landing page context meant it likely wasn't showing there anyway. I'll also restore that import if it was used.

## Changes

**`src/pages/Personal.tsx`:**
- Remove import of `FreeTrialPopup` (line 11)
- Remove `<FreeTrialPopup />` usage (line 112)

Two lines, one file.

