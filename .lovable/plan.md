## Goal
When a content block has a custom image, render it as a large half-width tile (image as background/card, title overlay) like the solo dashboard's `grid_size: 'half'` grid — not as a small icon inside a pill button. Reps get an "Image tile / Icon pill" toggle per block.

## Data
Extend `LinkBlock` in `src/components/rep/LivePhonePreview.tsx` with `image?: string | null` (already added) and `layout?: 'pill' | 'tile'` (default `'tile'` when an image is set, `'pill'` otherwise). Persist inside `settings.blocks` — no DB migration.

## `src/components/rep/LivePhonePreview.tsx`
- Compute `activeBlocks` as before, then group **consecutive tile blocks** into pairs for a 2-col grid, matching the solo renderer logic.
- Tile render (approx 155x155 within the 360-wide phone preview):
  - Aspect-square rounded-xl card, full-bleed `<img>` cover.
  - Dark 40% gradient overlay from bottom.
  - Title bottom-left in white 12/700, single line, truncate.
  - Single tile in a group spans 2 columns (`col-span-2`) but keeps a shorter aspect (aspect-[2/1]) so a lone tile still looks intentional.
- Pill render stays as today for image-less / layout='pill' blocks.
- Grouping resets whenever a non-tile block appears, so ordering is preserved.

## `src/pages/rep/RepDemoCreate.tsx`
- Inside each block row in the Links tab, add a small "Show as tile" switch next to the image tile. It only takes effect when `image` is set. Default on when the rep uploads an image.
- Persist `layout` alongside title/url/image in the blocks JSON.

## Out of scope
- Public `/:slug` renderer (unchanged this turn).
- Social icon rendering (already handled).
- Any new DB fields, grid_size sizing options, drag reorder.
