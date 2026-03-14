

# Allow Duplicate Links in Scraper

## Problem
The `extractLinks` function in `scrape-link-bio/index.ts` deduplicates links by normalized URL (lines 102-104). If a profile has two buttons pointing to the same YouTube channel (e.g., "Vlogs" and "Sauce" both linking to youtube.com/@user), the second one is silently dropped.

## Fix

### `supabase/functions/scrape-link-bio/index.ts` — Remove URL dedup (lines 102-104)

Remove the `seen` set and the `normalizedUrl` check. Instead, deduplicate by **label + URL** combo so truly identical duplicates (same text, same link) are still skipped, but two different buttons pointing to the same URL are preserved.

```ts
// Before:
const normalizedUrl = url.origin + url.pathname.replace(/\/$/, '');
if (seen.has(normalizedUrl)) continue;
seen.add(normalizedUrl);

// After:
const dedupeKey = label_text + '||' + url.origin + url.pathname.replace(/\/$/, '');
if (seen.has(dedupeKey)) continue;
seen.add(dedupeKey);
```

We need to compute `label` before the dedup check, so we'll reorder: extract label first, then dedup by `label + url`.

### File
- `supabase/functions/scrape-link-bio/index.ts` — reorder label extraction before dedup, change dedup key to `label||url`

