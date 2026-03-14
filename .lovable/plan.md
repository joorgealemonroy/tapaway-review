

# SEO Brand Dominance — TapAway

## Changes

### A. Install `react-helmet-async` + wrap App in `HelmetProvider`
- Add dependency, wrap `<App>` in `<HelmetProvider>`

### B. Per-page `<Helmet>` metadata

**Personal.tsx (`/`):**
- Title: "TapAway — All Your Links, One Tap Away"
- Description: "The ultimate digital business card and link-sharing platform. Connect with one tap using TapAway."
- Canonical: `https://tapaway.co/`
- OG tags with `logo-og.png`

**Index.tsx (`/business`):**
- Title: "TapAway for Business — Generate 5-Star Google Reviews Instantly"
- Description: "Transform your customer experience. Use TapAway to capture more 5-star reviews and grow your business reputation on autopilot."
- Canonical: `https://tapaway.co/business`

### C. JSON-LD structured data on homepage (`Personal.tsx`)
- `Organization` schema with logo, sameAs (TikTok, Instagram, Twitter, YouTube), contactPoint
- `WebSite` schema with SearchAction for sitelinks searchbox

### D. Create `public/sitemap.xml`
Priority: `/` (1.0), `/business` (0.9), `/personal/pricing` (0.8), `/personal/signup` (0.7), `/support` (0.4), legal pages (0.3), `/rep/apply` (0.4)

### E. Update `public/robots.txt`
Add `Sitemap: https://tapaway.co/sitemap.xml`

### F. Fix `index.html` OG image
Change from `.svg` to `/favicon.png` as fallback (user should later create a proper 1200x630 `logo-og.png` and drop it in `/public`)

### G. Add `rel="me"` to social links in footer
Both `Personal.tsx` and `Index.tsx` footers

### Files
- **New**: `public/sitemap.xml`
- **Modified**: `package.json`, `src/App.tsx`, `src/pages/Personal.tsx`, `src/pages/Index.tsx`, `index.html`, `public/robots.txt`

