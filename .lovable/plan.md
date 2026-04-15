

# Fix Social Discovery Fallback, Link Dedup & Logo Framing

## Changes

### 1. Website scraping fallback for socials (`magic-onboarding/index.ts`)

Add `scrapeWebsiteForSocials()` — when Outscraper returns no socials and a website URL exists, fetch the HTML and regex-extract Instagram, TikTok, and Facebook links from it.

### 2. Deduplicate links and remove "Our Space" (`magic-onboarding/index.ts`)

- Track used URLs in a `Set`. Skip any link whose URL is already added.
- When no socials are found but photos exist, link photo tiles to `googleMapsUri` (not the website). Use labels like `businessName` and "Gallery" instead of "Our Space".
- Never insert a link with `url: '#'` — skip it if no real URL exists.

### 3. Fix zoomed-in logo on public profiles (`PersonalProfilePage.tsx`)

The public profile renders the logo via `OptimizedAvatar` which hardcodes `object-cover` (line 247 of `OptimizedImage.tsx`). For business logos this crops them.

Two options — the safest is to add an `objectFit` prop to `OptimizedAvatar`:
- Add optional `objectFit?: 'cover' | 'contain'` prop (default `'cover'` to preserve existing behavior for personal headshots).
- In `PersonalProfilePage.tsx` line 1332, pass `objectFit="contain"` when the profile is a business (detected by checking if `profile_photo_url` comes from Supabase storage with a `/tile-` path, or simpler: always use `contain` since it looks fine for both logos and headshots in a circle).

Actually, `object-contain` inside a circle can leave empty space for headshots. Better approach: increase the logo container padding in `ProHubTemplate.tsx` and ensure `PersonalProfilePage` doesn't over-crop. Since `ProHubTemplate` already uses `object-contain` with `p-4`, the issue is likely on the **actual PersonalProfilePage** render — the `OptimizedAvatar` uses `object-cover` which crops logos.

**Fix**: Add `objectFit` prop to `OptimizedAvatar`, default to `cover`. Pass `contain` from `PersonalProfilePage` when appropriate.

### 4. Increase logo breathing room in `ProHubTemplate.tsx`

The frosted container already has `p-4`. Bump `max-h-24` to `max-h-28` and increase container `max-w-[180px]` to `max-w-[200px]` for more breathing room.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/magic-onboarding/index.ts` | Add `scrapeWebsiteForSocials()`, deduplicate URLs, fix "Our Space" labels, use `googleMapsUri` for photo tiles |
| `src/components/personal/OptimizedImage.tsx` | Add `objectFit` prop to `OptimizedAvatar` |
| `src/pages/personal/PersonalProfilePage.tsx` | Pass `objectFit="contain"` to logo avatar |
| `src/components/personal/ProHubTemplate.tsx` | Slightly increase logo container size for breathing room |

## Technical Details

**Website scraping** (new function):
```typescript
async function scrapeWebsiteForSocials(websiteUrl: string): Promise<SocialResult> {
  const res = await fetch(websiteUrl, { redirect: 'follow' });
  const html = await res.text();
  const ig = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  const tk = html.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/);
  const fb = html.match(/facebook\.com\/([a-zA-Z0-9_.]+)/);
  return {
    instagramUrl: ig ? `https://instagram.com/${ig[1]}` : null,
    tiktokUrl: tk ? `https://tiktok.com/@${tk[1]}` : null,
    facebookUrl: fb ? `https://facebook.com/${fb[1]}` : null,
  };
}
```

**Deduplication** (in link generation):
```typescript
const usedUrls = new Set<string>();
// Before each linksToInsert.push:
if (usedUrls.has(url)) continue;
usedUrls.add(url);
```

**Photo tile fallback** (no socials):
```typescript
// Use Google Maps URI instead of website
label: businessName,
url: googleData.googleMapsUri || googleData.websiteUrl || '#skip',
// Second tile:
label: 'Gallery',
url: googleData.googleMapsUri || googleData.websiteUrl || '#skip',
```

