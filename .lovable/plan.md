

# Add logo-og.png to Project

Copy the uploaded 1200x630 OG image to `public/logo-og.png` and update all OG/Twitter image references across `index.html`, `Personal.tsx`, `Index.tsx`, and `serve-og-profile` to use it instead of `favicon.png`.

## Changes

1. **Copy** `user-uploads://logo-og.png` → `public/logo-og.png`
2. **Update `index.html`**: Change `og:image` and `twitter:image` from `/favicon.png` to `https://tapaway.co/logo-og.png`
3. **Update `Personal.tsx`**: Change OG/Twitter image meta to `https://tapaway.co/logo-og.png`
4. **Update `Index.tsx`**: Same
5. **Update `serve-og-profile/index.ts`**: Change `defaultImage` fallback from `tapaway-logo.svg` to `logo-og.png`

