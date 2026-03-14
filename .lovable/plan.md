

# Show Link Thumbnails & Grid Layout in Import Previews

The current scraper strips all images from link elements, so both previews show plain text-only links. The user's hoo.be profile has rich image cards (YouTube thumbnails in a 2-column grid, logos on pill links). We need to extract those images and render them faithfully in both previews.

## Changes

### 1. Scraper: Extract Images from Links
**File**: `supabase/functions/scrape-link-bio/index.ts`

Update `extractLinks()` to also capture the first `<img src>` found inside each `<a>` tag. Add an `imageUrl` field to the returned link objects.

```ts
// In extractLinks, after extracting label:
const imgMatch = innerHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
const imageUrl = imgMatch?.[1] || null;
links.push({ label, url: href, type, imageUrl });
```

Update return type and the response shape to include `imageUrl` on each link.

### 2. Update Frontend Types
**File**: `src/pages/personal/ImportProfile.tsx`

Add `imageUrl` to `ScrapedLink`:
```ts
interface ScrapedLink {
  label: string;
  url: string;
  type: string;
  imageUrl?: string | null;
}
```

### 3. BeforePreview — Show Thumbnails Faithfully
Render links that have images as simple cards with the image visible (mimicking the source platform's layout). Links with images get a 2-column grid, others stay as plain pills.

### 4. AfterPreview — Match Real ProfilePreviewRenderer
Use the same rendering logic as the real profile:
- Links with `imageUrl` → square image cards in a `grid grid-cols-2 gap-2` layout (matching `renderLink` grid mode)
- Links without images but with thumbnails → pill with 10×10 rounded image on the left (matching `renderLink` thumbnail mode)
- Plain links → glass pill with platform icon

This directly mirrors the `ProfilePreviewRenderer.renderLink()` patterns for cover images, thumbnails, and standard pills.

### 5. handleClaimPage — Pass Image URLs
Update the sessionStorage data to include `imageUrl` so signup can pre-populate cover images on links.

## Files Modified
- `supabase/functions/scrape-link-bio/index.ts` — extract `imageUrl` from `<img>` inside `<a>` tags
- `src/pages/personal/ImportProfile.tsx` — update types and both preview components to render images

