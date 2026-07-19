# SEO: Organization Schema + Favicon Ecosystem

## Part 1 — Organization JSON-LD in `index.html`
Insert inside `<head>` (after existing meta tags):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TapAway",
  "url": "https://tapaway.co",
  "logo": "https://tapaway.co/apple-touch-icon.png",
  "sameAs": [
    "https://www.instagram.com/tapawayco",
    "https://www.tiktok.com/@tapawayco",
    "https://twitter.com/tapawayco",
    "https://www.youtube.com/@tapawayco"
  ]
}
</script>
```

Note: Using our real, verified social handles (`tapawayco`) instead of the placeholder `tapaway` handles from the brief — mismatched `sameAs` entries hurt entity confidence rather than help.

## Part 2 — Favicon & Icon Assets

Current state in `/public`: only `favicon.ico` and `favicon.png` exist. Missing: `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180).

Steps:
1. Generate a crisp square TapAway logo mark (transparent background) via `imagegen` at 512×512.
2. Derive the three missing sizes (`16x16`, `32x32`, `180x180`) from that master using ImageMagick/`sharp` in the sandbox and write them to `/public`.
3. Keep existing `favicon.ico` and `favicon.png` in place (backward compatibility with hard-coded references).
4. Replace the current icon `<link>` tags in `index.html` with the full set:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

## Part 3 — Preserve Messaging
No changes to:
- `<title>TapAway - Share Who You Are</title>`
- `<meta name="description">`
- `og:title`, `og:description`, `twitter:*` copy

The existing sitewide `og:image` (`/logo-og.png`) also stays as-is.

## Files touched
- `index.html` — add JSON-LD block + expand icon `<link>` tags
- `public/apple-touch-icon.png` (new, 180×180)
- `public/favicon-32x32.png` (new)
- `public/favicon-16x16.png` (new)

## Out of scope
- Per-route JSON-LD (Index.tsx and Personal.tsx already ship their own Organization/WebSite schemas via Helmet — leaving those alone)
- Sitemap / robots changes
- Any user-facing copy
