

# Fix Import Preview: Scrape Full Layout & Map Links Correctly

The preview shows only header/avatar/name because **hoo.be renders content via JavaScript** — the simple `fetch` gets an empty shell with no links in the HTML. Additionally, the data mapping needs to distinguish between grid image cards (YouTube thumbnails) and pill links with small logos (like "BSM", "Trenchies Candy").

## Changes

### 1. Fix hoo.be Scraping (`supabase/functions/scrape-link-bio/index.ts`)

hoo.be embeds profile data as JSON inside `<script>` tags (common pattern for JS-rendered sites). Add a `extractHooBe()` function that:
- Searches for `__NEXT_DATA__` or similar JSON payloads in `<script>` tags
- Falls back to extracting any JSON objects containing arrays of links/URLs
- Extracts social links, content links with images, profile name, bio, and photo

Also update the main handler to route `hoo.be` through this extractor (similar to the Stan Store path).

### 2. Better Image Mapping (`src/pages/personal/ImportProfile.tsx`)

Update `scrapedToPreviewProps` to distinguish link types:
- Links with `imageUrl` where the URL is YouTube/video → `cover_image_url` + `grid_size: "half"` (renders as grid image cards)
- Links with `imageUrl` where the URL is NOT video → `thumbnail_url` (renders as pill with small logo on the left)
- Links without images → standard pill with platform icon

This maps directly to the three rendering paths in `ProfilePreviewRenderer.renderLink()`:
```text
Grid card:  cover_image_url + grid_size="half" → 2-col image cards
Thumbnail:  thumbnail_url → pill with small image on left
Plain pill:  neither → pill with platform icon
```

### 3. Pass `thumbnail_url` through to signup

Update `handleClaimPage` to include `imageUrl` and a `displayHint` field so the signup flow knows whether to use the image as a cover or thumbnail.

## Files Modified
- `supabase/functions/scrape-link-bio/index.ts` — add hoo.be JSON extraction
- `src/pages/personal/ImportProfile.tsx` — smarter image→grid/thumbnail mapping

