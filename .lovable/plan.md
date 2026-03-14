

# Brand Dominance & Social Verification SEO Updates

## Changes

### 1. Update Title Format (Personal.tsx)
Change from em-dash to pipe format per brand guidelines:
- **Before**: `TapAway — All Your Links, One Tap Away`
- **After**: `TapAway | All Your Links, One Tap Away`

Update both `<title>` and `og:title`, `twitter:title` tags.

### 2. Add Twitter Image Meta (Personal.tsx & Index.tsx)
Add missing `<meta name="twitter:image" content="https://tapaway.co/logo-og.png" />` to both pages' Helmet blocks.

### 3. Footer Social Links with rel="me" (Personal.tsx & Index.tsx)
Replace existing footer link sections with social media links that include `rel="me"` for Google's SameAs verification:

**Personal.tsx footer:**
- TikTok (@tapawayco)
- Instagram (@tapawayco)  
- X/Twitter (@tapawayco)
- YouTube (@tapawayco)
- Separator + existing legal links

**Index.tsx footer:**
- Same social links + existing legal links

### 4. Verify OG Image References
All pages already point to `logo-og.png` — no changes needed.

## Files Modified
- `src/pages/Personal.tsx` — title format, twitter:image, footer social links with rel="me"
- `src/pages/Index.tsx` — twitter:image, footer social links with rel="me"

