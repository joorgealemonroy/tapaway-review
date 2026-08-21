# Menu sheet: no auto-open section, remove section chips

Adjust the mobile-first menu accordion so it opens in a calmer state and removes the redundant chip row.

## What changes

1. **No default-open section** — When the visitor taps the menu button, the menu sheet opens with every section collapsed. No section is automatically selected or expanded.
2. **Remove section chips** — Delete the horizontally scrollable row of section chips under the search bar. Visitors will still scroll the menu naturally, and the search bar remains as the primary filtering tool.

## Files to change

- `src/components/personal/MenuDisplay.tsx` only.

## Implementation notes

- Change `openSections` default from `new Set([0])` to `new Set()` so all sections are collapsed on open.
- Remove the chip row rendered under the search input (the `!q && filteredSections.length > 1` block).
- Keep the accordion expand/collapse behavior, search auto-expand behavior, emoji, item counts, and sticky header/X close button exactly as they are.
- Reset `openSections` to `new Set()` when the sheet closes so the next open is also clean.
- No backend, parser, or database changes.

## Verification

Open a hub with a menu at mobile width. Tapping the menu button should show all sections collapsed, with no chip row under the search bar. Tapping a section expands it, search still auto-expands matches, and X closes the sheet.
