

# Fix: Deduplicate YouTube Icon + Show Images on Pill Links

## Problems
1. **Two YouTube icons**: The scraper returns YouTube as a social icon AND the "Vlogs" content link uses `display_style: "both"` (which adds another YouTube icon). Need to remove the social YouTube icon when a "both" content link covers it.
2. **Pill links missing images**: "Work with me 1 on 1" and "Trenchies Candy" have images on the source profile but the mapping sets `cover_image_url: null` and `thumbnail_url: null` for non-YouTube links. These should use `thumbnail_url` to show their images.

## Changes — `src/pages/personal/ImportProfile.tsx`

### A. Filter duplicate YouTube social icon
Before building `allLinks`, check if any content link is YouTube with `display_style: "both"`. If so, filter out the YouTube entry from `socialLinks` to avoid a duplicate icon.

### B. Set `thumbnail_url` for non-YouTube image links
For content links that have images but aren't YouTube, set `thumbnail_url: l.imageUrl` so they render as pills with thumbnail images (matching the source profile's appearance).

```text
Before:  thumbnail_url: null  (for all links)
After:   thumbnail_url: (!isYtWithImage && hasImage) ? l.imageUrl : null
```

## File
- `src/pages/personal/ImportProfile.tsx` — update `scrapedToPreviewProps`

