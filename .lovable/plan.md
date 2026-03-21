

# Fix Backend Edge Function: Add Social Media Support (Spotify Domains Fixed)

## Changes — `supabase/functions/scrape-link-bio/index.ts`

### 1. Expand `ALLOWED_DOMAINS` (lines 6-15)
Add social media domains with correct Spotify URLs:
```ts
const ALLOWED_DOMAINS = [
  'linktr.ee', 'stan.store', 'beacons.ai', 'lnk.bio',
  'bio.link', 'campsite.bio', 'linkpop.com', 'hoo.be',
  'instagram.com', 'tiktok.com', 'youtube.com',
  'x.com', 'twitter.com', 'twitch.tv',
  'spotify.com', 'open.spotify.com',
];
```

### 2. Fix `twitch.tv` in `LINK_TYPE_MAP` (line 40)
`'twitch.tv': 'website'` → `'twitch.tv': 'twitch'`

### 3. Social URL detection + OG-only fallback (after HTML fetch, ~line 258)
Insert a social domain check before the platform-specific routing block:

```ts
const SOCIAL_DOMAINS = [
  'instagram.com', 'tiktok.com', 'youtube.com',
  'x.com', 'twitter.com', 'twitch.tv',
  'spotify.com', 'open.spotify.com',
];
const isSocialUrl = SOCIAL_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
```

Then wrap the existing platform routing (Stan Store / generic extraction) in an `if (!isSocialUrl)` block, and add a new `else` branch for social URLs that:
- Uses only OG meta tags for `name`, `bio`, `photoUrl`
- Returns the input URL as the single link with auto-detected type
- Skips all link-block extraction

### 4. Social URL response shape
```json
{
  "name": "og:title cleaned",
  "bio": "og:description or null",
  "photoUrl": "og:image or null",
  "links": [{ "label": "Instagram", "url": "https://instagram.com/user", "type": "instagram", "imageUrl": null }],
  "socialLinks": [{ "label": "instagram", "url": "https://instagram.com/user", "type": "instagram" }]
}
```

## File
| File | Change |
|------|--------|
| `supabase/functions/scrape-link-bio/index.ts` | Expand allowlist, fix twitch type, add OG-only social fallback |

