# Snap the menu: photos in, full menu out

Add a photo-based menu builder to the menu block editor. Owners and reps upload up to 15 photos of a physical menu, AI reads every page, and the whole menu appears as editable sections — no typing.

## What the user sees

In the "Configure block" menu modal, above the paste box:

1. A drop/tap area: **Add menu photos** (camera or gallery on mobile, up to 15 at once).
2. Thumbnails of the selected pages, each removable, with a page counter (e.g. "4 / 15").
3. A primary button: **Read menu from photos**, showing progress ("Reading page 2 of 4…").
4. When done: a toast with the totals ("Added 6 sections, 48 items") and the sections appear below, fully editable. Prices, descriptions and section headings come through as-is.
5. The extracted menu also fills the text box, so the owner can eyeball or fix anything in plain text and rebuild.

Guardrails: max 15 images per run, max 20MB per image before compression, clear inline error if a photo is unreadable — that page is skipped and named, the rest still import.

## How it works

- **Upload/compress (client)**: reuse the existing image compression path (`src/lib/imageOptimization.ts`) to downscale each photo to a long-edge cap suitable for OCR, then convert to base64 data URLs. Nothing is stored permanently — the photos are only sent for reading.
- **Extraction (server)**: extend the existing `parse-menu-image` edge function to accept `{ images: string[] }` (base64 data URLs) alongside the current single `imageUrl` shape, so existing callers keep working. Images are read in small batches (3 per gateway request) and merged, which keeps each request well inside limits and gives per-page progress.
- **Model**: `openai/gpt-5.6-sol` via the Lovable AI Gateway with structured output, replacing the current older model call. The prompt instructs: preserve exact wording and prices, keep section order across pages, merge a section that continues onto the next page instead of duplicating it, and drop non-menu text (hours, addresses, phone numbers).
- **Merging**: sections with the same name across pages merge into one; duplicate items (same name and price) are dropped. Result is appended to the existing sections list, same as the text importer does today.
- **Errors**: gateway statuses are surfaced verbatim — rate limit, out of credits, or blocked shows a specific message rather than a generic failure. Only transient failures retry, once per batch.

## Technical notes

- `src/components/personal/MenuBlockEditor.tsx`: new photo panel, file input with `accept="image/*" multiple`, thumbnail strip, per-batch progress state, merge + `parseMenuText`-compatible text fill.
- `supabase/functions/parse-menu-image/index.ts`: accept `images: string[]`, validate count (<=15) and payload size, batch by 3, call the gateway per batch, merge sections server-side, return `{ success, menu: { sections }, skipped: [] }`. Keeps the `imageUrl` path intact.
- New shared helper in `src/lib/menuBlock.ts` for merging section arrays and serializing sections back into the plain-text format used by the paste box.
- No database or storage changes; no new secrets (`LOVABLE_API_KEY` already exists).

## Verification

Run a real multi-page menu through the function and read the response before calling it done, then check the modal end-to-end in the preview at mobile width.
