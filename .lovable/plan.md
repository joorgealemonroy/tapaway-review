

# Update Favicon to New PNG Brand Icon

## Current State
- `index.html` already has the correct favicon references at lines 6-7:
  ```html
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  ```
- No old SVG favicon references exist in `index.html`
- User has uploaded `user-uploads://favicon.png` with new TapAway "TA" logo

## Changes Required

### 1. Copy Uploaded Favicon
Copy `user-uploads://favicon.png` → `public/favicon.png` to replace the existing favicon with the new brand icon.

### 2. Verification
The `index.html` file already has the correct tags configured (lines 6-7), so no HTML changes are needed. The new favicon will automatically be used once copied to `public/`.

## Files Modified
- **Replaced**: `public/favicon.png` (new TA logo)

