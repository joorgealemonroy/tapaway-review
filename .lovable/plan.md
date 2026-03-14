

# Fix Profile Photo Not Loading on Import

## Problem
The scraper returns `photoUrl: "https://linktr.ee/og/image/realjulioo.jpg"` — this is Linktree's OG image endpoint. Linktree blocks cross-origin image loading from other domains, so the browser cannot render it in an `<img>` tag.

## Solution — Extract the actual profile photo from HTML

Linktree embeds the real profile photo as a `<img>` inside the page HTML (typically inside an avatar container) using their CDN (`ugc.production.linktr.ee`), which does allow cross-origin loading (as proven by the link thumbnails loading fine).

### `supabase/functions/scrape-link-bio/index.ts`

Add a Linktree-specific profile photo extraction that looks for the actual avatar `<img>` in the HTML before falling back to the OG image:

```ts
// Extract profile photo from Linktree avatar element
// Pattern: <img> with src pointing to their CDN inside a profile/avatar container
function extractLinktreeAvatar(html: string): string | null {
  // Linktree uses profile-picture or avatar img with ugc.production.linktr.ee
  const match = html.match(/<img[^>]+src=["'](https:\/\/ugc\.production\.linktr\.ee\/[^"'?]+[^"']*)["'][^>]*>/i);
  if (match?.[1]) return match[1];
  return null;
}
```

In the Linktree branch of platform routing (~line 270), prefer the extracted avatar over OG image:

```ts
if (hostname === 'linktr.ee' || hostname.endsWith('.linktr.ee')) {
  photoUrl = extractLinktreeAvatar(html) || metaPhoto;
}
```

This ensures we get the actual CDN-hosted profile photo that browsers can load, rather than the blocked OG image endpoint.

## File
- `supabase/functions/scrape-link-bio/index.ts` — add `extractLinktreeAvatar()` function; use it in the generic extraction branch for Linktree hostnames

