

# Fix hoo.be Import: Extract All Links + Correct Layout Mapping

## Problem

The scraper returns only 2 content links + 1 social link for `hoo.be/bsmfredo`, but the actual profile has:
- **3 social icons**: Instagram, YouTube, X (rendered as SVG-only anchors with no text → skipped by `extractLinks`)
- **4 content buttons with images**: "Youtube (vlogs)", "YouTube (sauce)", "Work with me 1 on 1", "Trenchies Candy"

Two issues in the scraper:
1. **Social icon links are SVG-only** (no text label) → `extractLinks` skips them because `!label`
2. **YouTube content buttons** (vlogs/sauce) have labels + images but `detectLinkType` returns `"youtube"` → they get filtered into `socialLinks` instead of staying as content links. Since they have images and text labels, they should be content links.

## Plan

### 1. Fix scraper (`supabase/functions/scrape-link-bio/index.ts`)

**A. Keep image-bearing labeled links as content, not social:**
After extracting all links from Firecrawl HTML, change the social/content split logic. If a link has BOTH a text label AND an image, treat it as a content link regardless of URL domain. Only classify bare icon-only links (no image, short/no label) as social.

```text
Current logic:
  socialLinks = allLinks.filter(l => socialTypes.has(l.type))
  contentLinks = allLinks.filter(l => !socialTypes.has(l.type))

New logic:
  socialLinks = allLinks.filter(l => socialTypes.has(l.type) && !l.imageUrl)
  contentLinks = allLinks.filter(l => !socialTypes.has(l.type) || l.imageUrl)
```

**B. Extract SVG-only social icon links:**
Add a hoo.be-specific function that finds anchor tags containing SVGs but no text — these are the social icon circles (Instagram, X, YouTube). Parse the `href` to determine the platform type and add them as social links.

Pattern to match: `<a href="https://instagram.com/..." ...><svg ...></svg></a>` where inner text after stripping tags is empty.

### 2. Fix frontend mapping (`src/pages/personal/ImportProfile.tsx`)

Update `scrapedToPreviewProps` so content links with images that point to YouTube get `cover_image_url` + `grid_size: "half"` (renders as side-by-side grid cards in the preview). This matches the user's request: "Vlogs" and "Sauce" should appear as half-width image cards next to each other.

The current code already does this for video URLs — the key fix is on the scraper side to ensure these links arrive as `contentLinks` instead of `socialLinks`.

## Files Modified
- `supabase/functions/scrape-link-bio/index.ts` — smarter social vs content classification + SVG-only social icon extraction
- `src/pages/personal/ImportProfile.tsx` — no changes needed (existing logic already maps video+image to grid cards)

