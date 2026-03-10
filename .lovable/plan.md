

# Fix Scraper: Stan Store Returns 0 Links + Title Not Cleaned

## Root Cause Analysis

After fetching and analyzing actual HTML from both Stan Store and Linktree, I found three distinct problems:

### Problem 1: Stan Store uses `<button>` elements, not `<a>` tags
Stan Store is SSR via Nuxt, so the HTML IS present -- but product blocks use `<button class="cta-button__button">` instead of `<a href>` tags. The current scraper only looks for `<a>` anchor tags, so it finds 0 links. However, the block titles and descriptions ARE in the HTML inside `<h4 class="block__heading">` and description divs.

### Problem 2: Title not stripped properly  
The regex strips `"| Stan Store"` but the actual og:title contains `"| Stan"` (without "Store"). Result: `"Brendan Ruh (@santacruzmedicinals) | Stan"` instead of `"Brendan Ruh"`.

### Problem 3: Stan Store has a dedicated SSR name element
`<div class="store-header__fullname">Brendan Ruh</div>` -- cleaner than the og:title which includes the handle.

## Solution: Platform-Specific Extractors

Rewrite the edge function with a layered extraction approach:

1. **`extractStanStoreBlocks(html)`** -- New function that parses Stan Store's SSR block structure:
   - Find all `<div class="block block--callout"` elements
   - Extract title from `<h4 class="block__heading">` inner text
   - Extract CTA label from `<div class="cta-button__label">` 
   - Use CTA label as link label, title as fallback
   - No external URL available, so set `url` to the original Stan Store page URL
   - Extract `store-header__fullname` for the profile name
   - Extract profile photo from `<img class="base-preview-image">` in the header

2. **Fix title stripping regex** -- Add `Stan` (without "Store") and `(@handle)` pattern to the strip list:
   ```
   /\s*\([@\w]+\)\s*/g  -- strip (@handle)
   /\s*\|\s*(Linktree|Stan Store|Stan|Beacons|lnk\.bio|Bio Link|Campsite).*$/i
   ```

3. **Linktree extraction stays the same** -- Confirmed working. Linktree SSR includes real `<a href>` tags pointing to external URLs. The anchor-based extractor works correctly for Linktree.

4. **Platform detection** -- Route to the correct extractor based on hostname:
   - `stan.store` → `extractStanStoreBlocks()` + meta fallback
   - Everything else → existing anchor-based `extractLinks()`

## File Changed
- `supabase/functions/scrape-link-bio/index.ts` -- Add Stan Store block parser, fix title cleaning, add platform routing

## No other files affected
The `ImportProfile.tsx` page and signup integration remain unchanged since the response shape stays the same.

