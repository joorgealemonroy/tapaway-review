

# Fix: Trigger Firecrawl for JS-Rendered Sites Missing Content Links

## Problem
The initial HTML fetch from `hoo.be/bsmfredo` now correctly extracts 3 social icons (Instagram, YouTube, X) from SVG-only anchors. But the 4 content buttons (Vlogs, Sauce, Work with me 1 on 1, Trenchies Candy) are JS-rendered and not in the initial HTML.

The Firecrawl fallback condition on line 281 requires **both** `contentLinks` and `socialLinks` to be 0:
```ts
if (isJsRendered && contentLinks.length === 0 && socialLinks.length === 0)
```

Since `socialLinks.length === 3`, Firecrawl never fires, and content links stay at 0.

## Fix

### 1. Change Firecrawl trigger condition (`scrape-link-bio/index.ts`, line 281)

Change from `&&` to trigger when **content** links are missing (the important ones):
```ts
if (isJsRendered && contentLinks.length === 0)
```

When Firecrawl HTML comes back, merge any new social links found in it with the ones already extracted from the initial fetch (dedup by URL), and replace content links entirely.

### 2. No frontend changes needed

The `ImportProfile.tsx` mapping already assigns `cover_image_url` + `grid_size: "half"` to links with images, which renders them as side-by-side grid cards in `ProfilePreviewRenderer`. The two YouTube buttons will appear half-width next to each other, and "Work with me 1 on 1" and "Trenchies Candy" will render as thumbnail pills below — exactly matching the reference image.

## Files Modified
- `supabase/functions/scrape-link-bio/index.ts` — fix Firecrawl trigger condition + merge social links

