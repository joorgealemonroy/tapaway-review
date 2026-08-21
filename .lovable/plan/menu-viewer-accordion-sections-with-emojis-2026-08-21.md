# Menu viewer: accordion sections with emojis

Make the full-menu sheet calmer and more phone-friendly by collapsing each section into a tappable accordion row with a matching emoji, instead of one long scrolling wall of items.

## What the visitor sees

1. **Section rows, collapsed by default** — each row shows an emoji, the section name, and the item count, with a chevron that rotates when open. The first section starts expanded so the sheet never looks empty.
2. **Tap to expand** — smooth height/opacity animation; multiple sections can be open at once. Tapping the section chip at the top opens that section and scrolls to it.
3. **Emoji per section** — chosen automatically from the section name (tacos, mariscos/seafood, bebidas/drinks, cerveza/beer, postres/desserts, kids, breakfast, sides/extras, soups, salads, burgers, pizza, coffee, etc.), with a sensible default (a fork-and-knife) when nothing matches. Bilingual keyword matching (English + Spanish) since menus are often Spanish.
4. **Search behaves as expected** — while typing, all matching sections auto-expand so results are visible immediately; clearing search returns to the collapsed state.
5. **Polish** — softer card surfaces, tighter row rhythm, price aligned right with tabular numerals, comfortable 44px+ tap targets, and the existing sticky header, search, chips, and X button all stay.

## Technical notes

- New helper `sectionEmoji(name: string)` in `src/lib/menuBlock.ts`: lowercase + accent-strip the section name, match against an ordered keyword table, return an emoji string.
- `src/components/personal/MenuDisplay.tsx`: add `openSections` state (`Set<number>`), default `{0}`; reset on close. When `q` is non-empty, treat every filtered section as open. Section heading becomes a `<button>` with `aria-expanded`; item list renders only when open. Use a CSS grid-rows transition (`grid-template-rows: 0fr -> 1fr`) for the smooth collapse rather than a JS measurement.
- Chip `jumpTo(index)` also adds that index to `openSections` before scrolling.
- Keep the `IntersectionObserver` active-chip logic; it observes the section wrappers, which still exist when collapsed.
- No database, backend, or parser changes. Existing menu data renders as-is.

## Verification

Open a hub menu in the preview at mobile width: sections collapsed, emojis present, tapping expands/collapses smoothly, search auto-expands matches, chips jump and open, X still closes.
