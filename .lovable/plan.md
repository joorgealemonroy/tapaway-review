## Goal
Let reps attach a custom image thumbnail to each Social Block (Instagram, Yelp, Facebook, TikTok) and each Content Block, matching how solo dashboard links use `cover_image_url`.

## Data model (no DB changes)
Everything already lives in `restaurants.settings` JSON.
- Extend `Socials` from `{instagram, yelp, facebook, tiktok}` strings to per-platform objects: `{ url: string; image?: string }`. Keep backwards-read for old string values.
- Extend `LinkBlock` with optional `image?: string`.

## `src/pages/rep/RepDemoCreate.tsx`
1. **Socials editor (Links tab)** — for each of Instagram / Yelp / Facebook / TikTok, add a small 40x40 image tile next to the URL input with an Upload / Replace / Remove control. Reuse existing `restaurant-logos` bucket with user-scoped path `${user.id}/social-${platform}-${ts}-${filename}`.
2. **Content Blocks editor** — add the same small image tile inside each block row; uploads use path `${user.id}/block-${blockId}-${ts}-${filename}`.
3. Normalize on load: if `settings.socials.instagram` is a plain string, coerce to `{ url }`. Save always writes the object form.
4. Migration is purely runtime (JSON reshape), no SQL.

## `src/components/rep/LivePhonePreview.tsx`
1. Update `Socials` and `LinkBlock` types to include `image?`.
2. Social row: when `image` is set, render a 36x36 rounded thumbnail (`<img>` object-cover) instead of the branded lucide icon; keep the current icon fallback.
3. Content block buttons: when `image` is set, render a small 24x24 rounded thumbnail on the left instead of the generic lucide icon; keep icon fallback.

## Out of scope
- No changes to public `/:slug` hub renderer, gallery, header banner, colors, leads tab, or DB schema.
- No image cropping UI — plain upload only, matching the current logo/banner uploaders.
- No changes to how deep-links resolve on tap; images are pure visual.
