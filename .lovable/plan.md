

# Import from Linktree / Stan Store — Resilient Markdown-Based Approach

## Key Insight

Instead of scraping CSS classes or parsing `__NEXT_DATA__` JSON (which platforms actively obfuscate), we use **Firecrawl's markdown extraction**. Testing confirms Linktree and Stan Store both produce clean, structured markdown with link labels, URLs, profile names, and photos already extracted — no CSS class dependency at all.

**However**, Firecrawl is not currently connected to this project. We have two options:

1. **Use Firecrawl connector** — best quality extraction, handles JS-rendered pages, anti-bot bypasses
2. **Simple server-side `fetch` + regex** — free, no API key, but may fail on JS-heavy pages or get blocked

I'll plan for **option 2 first** (simple fetch) with a Firecrawl upgrade path, since Linktree pages are SSR and the markdown structure from a basic fetch is sufficient.

## Changes

### 1. New edge function: `scrape-link-bio/index.ts`
- Accepts `{ url: string }`
- Validates URL against allowlist: `linktr.ee`, `stan.store`, `beacons.ai`, `lnk.bio`
- Fetches raw HTML via `fetch()`
- **Parsing strategy** (resilient, no CSS classes):
  - **Profile name**: Extract from `<title>` tag or `<meta property="og:title">`
  - **Profile photo**: Extract from `<meta property="og:image">` 
  - **Links**: Parse `<a>` tags with `href` containing external URLs, extract `data-testid` attributes where available, and use anchor text as labels
  - **Social icons**: Detect platform URLs in footer social links (Instagram, YouTube, X, etc.)
- Maps scraped URLs to TapAway link types using URL pattern matching (instagram.com → `instagram`, tiktok.com → `tiktok`, etc.)
- Returns: `{ name, photoUrl, links: [{label, url, type}], socialLinks: [{url, type}] }`

### 2. New page: `src/pages/personal/ImportProfile.tsx`
- Route: `/import`
- UI: Paste field + "Import" button + supported platform logos
- Calls edge function, shows loading state
- Displays extracted links in a TapAway-style preview
- "Use This Layout" → saves to `sessionStorage` as `tapaway_import_data` → navigates to `/personal/signup`
- "Start Fresh Instead" link → straight to signup

### 3. Update `src/pages/personal/PersonalSignup.tsx`
- On mount, check `sessionStorage` for `tapaway_import_data`
- If present, pre-fill `onboardingData` with imported name and links
- Map each link to the correct TapAway link type using URL pattern detection
- Clear sessionStorage after consuming

### 4. Update routing (`src/App.tsx`)
- Add lazy-loaded route: `/import` → `ImportProfile`

### 5. Add discovery CTA (`PersonalHero.tsx`)
- Add a small secondary link below the main CTA: "Already have a Linktree? Import it →"
- Links to `/import`

## Link Type Detection (in edge function)

```text
instagram.com    → instagram
tiktok.com       → tiktok
youtube.com      → youtube
twitter.com/x.com → x
spotify.com      → spotify
facebook.com     → facebook
linkedin.com     → linkedin
snapchat.com     → snapchat
pinterest.com    → pinterest
soundcloud.com   → soundcloud
apple.com/music  → apple_music
podcasts.apple   → podcast
open.spotify     → spotify
venmo.com        → venmo
cash.app         → cashapp
*                → website
```

## Files Created/Modified
- **Create**: `supabase/functions/scrape-link-bio/index.ts`
- **Create**: `src/pages/personal/ImportProfile.tsx`
- **Modify**: `src/App.tsx` (add route)
- **Modify**: `src/pages/personal/PersonalSignup.tsx` (consume import data)
- **Modify**: `src/components/landing/personal/PersonalHero.tsx` (add secondary CTA)
- **Modify**: `supabase/config.toml` — wait, this file shouldn't be edited. The edge function JWT verification will be handled in code.

No new dependencies. No API keys needed.

