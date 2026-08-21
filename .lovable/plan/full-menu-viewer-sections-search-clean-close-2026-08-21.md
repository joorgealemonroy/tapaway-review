# Full-menu viewer: sections, search, clean close

Turn the menu popup into a real, mobile-first menu browser, and make the AI reader clean up what it reads so the text always makes sense.

## What the visitor sees

Tapping the menu button opens a full-screen sheet (on mobile) / centered panel (desktop):

1. **Sticky top bar** — menu title on the left, a round **X** close button on the top right, always visible while scrolling.
2. **Search bar** directly under the title: "Search the menu…". Typing filters items live by name and description; sections with no match disappear; a friendly "No items match ..." state with a clear button when nothing is found. Search clears when the sheet closes.
3. **Section chips** — a horizontally scrollable row of section names under the search bar. Tapping one smooth-scrolls to that section; the chip for the section currently in view highlights itself as you scroll. Chips hide while searching.
4. **Sections** — each with a sticky-ish heading, item name, optional description, and price aligned right. Comfortable tap-size rows, dividers between items, generous bottom padding so the last item is never hidden.
5. Item counts per section heading (e.g. "Tacos · 8") so it reads as a real menu.

Everything uses the hub's existing theme tokens — no hardcoded colors — and the sheet scrolls independently with the page locked behind it.

## Make the AI-read menu make sense

The photo reader is upgraded from strict transcription to "transcribe, then sanity-check":

- Fix obvious OCR damage using context clues (broken words, `l`/`1`, `O`/`0`, missing decimal in prices like `350` -> `$3.50` when neighbouring items are `$3.25`), while never inventing items or changing real prices.
- Correct casing: item and section names in Title Case, descriptions in sentence case — no ALL CAPS walls.
- Drop stray fragments that are not items (page numbers, "continued", decorative text).
- Move text that is clearly a description off the name line and into the description field.
- Keep sections in printed order and merge a section split across pages.

## Technical notes

- `src/components/personal/MenuDisplay.tsx`: rewrite the dialog body — sticky header with `DialogClose` X button, controlled search state, `useMemo` filtering over `visibleSections`, section refs + `IntersectionObserver` for the active chip, `scrollIntoView({ behavior: "smooth", block: "start" })` for chip taps. Mobile-first sizing: `h-[92dvh]` full-bleed on small screens, `max-w-lg` rounded panel from `sm:` up. Reset search on `onOpenChange(false)`.
- Hide shadcn's default dialog close (it overlaps the new bar) by rendering our own in the sticky header.
- `supabase/functions/parse-menu-image/index.ts`: extend `SYSTEM_PROMPT` with the clean-up rules above; no signature, model or schema change. Redeploy the function.
- No database or storage changes.

## Verification

Open a hub with a real menu in the preview at mobile width, confirm search filters, chips jump to sections, the X closes the sheet, and re-run one photo through the reader to confirm cleaner casing and prices.
