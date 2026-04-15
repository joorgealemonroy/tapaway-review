

# Fix Magic Onboarding: Social Discovery, Duplicate Maps, and Blank Tiles

## Problems Identified

1. **Blank grid tiles** — Magic onboarding writes images to `thumbnail_bg_url`, but the main profile renderer (`PersonalProfilePage.tsx`) reads `cover_image_url`. Only `ProHubTemplate` reads `thumbnail_bg_url`. Result: tiles show with no background images.

2. **Google Maps URI repeats twice** — When no socials are found, the fallback creates two tiles linking to `googleMapsUri` and `googleMapsUri#photos`. The `#photos` anchor is a hack to bypass dedup, but both appear as separate maps links.

3. **Facebook pill uses `link_type: 'custom'`** — Should use `link_type: 'facebook'` so it gets the proper Facebook icon and blue styling from `platformLinks.tsx`.

4. **Social media still not being fetched** — The website scraper fallback works but many businesses don't have websites either. Need to also try Outscraper's `fields` parameter for `instagram,tiktok,facebook` which may not be working correctly.

5. **First two tiles should always be social placeholders** — Even when socials aren't found, create Instagram and TikTok placeholder tiles with uploaded photos so the user can fill them in later. Show a tooltip/note encouraging them to add their handles.

## Changes

### 1. Fix image field: use `cover_image_url` instead of `thumbnail_bg_url` (`magic-onboarding/index.ts`)

Change all grid tile inserts to set `cover_image_url` (which `PersonalProfilePage` renders) instead of `thumbnail_bg_url`. This fixes the blank tiles immediately.

### 2. Fix duplicate Google Maps links (`magic-onboarding/index.ts`)

When no socials are found, instead of creating two maps tiles, create two **social placeholder** tiles (Instagram + TikTok) with the uploaded photos as `cover_image_url`. Set `url` to `#placeholder-instagram` and `#placeholder-tiktok` — these won't be clickable but will look aesthetic. The label should hint at what to do: "Add Instagram" and "Add TikTok".

Alternatively (better UX): create the tiles with `is_active: false` so they appear in the dashboard editor but not on the live hub until the user adds their handles.

### 3. Fix Facebook `link_type` (`magic-onboarding/index.ts`)

Change `link_type: 'custom'` to `link_type: 'facebook'` for the Facebook pill. This gives it the proper icon and gradient from `platformLinks.tsx`.

### 4. Improve Outscraper query (`magic-onboarding/index.ts`)

Add `&fields=instagram,tiktok,facebook,site` to the Outscraper URL to explicitly request social fields. Also check `biz.site` as an alternate website field.

### 5. Always create social tiles first with photos (`magic-onboarding/index.ts`)

Restructure the link generation priority:
- **Always** create two half-grid tiles at positions 0 and 1 using uploaded photos
- If Instagram found: first tile = Instagram with photo
- If TikTok found: second tile = TikTok with photo  
- If neither found: create placeholder tiles with photos, labeled "Add Instagram" / "Add TikTok", set `is_active: false` so they show in dashboard but not on live hub
- Then add Google Review pill, Website pill, Directions pill as before
- Facebook only as a pill (with proper `link_type: 'facebook'`), never duplicating existing links

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/magic-onboarding/index.ts` | Fix `cover_image_url` vs `thumbnail_bg_url`, fix Facebook link_type, remove duplicate maps hack, add social placeholders, improve Outscraper fields |

## Expected Result

- Grid tiles show images properly on all profile templates
- No duplicate Google Maps links
- Facebook gets proper icon/styling
- Every new profile gets two aesthetic photo tiles at the top (social or placeholder)
- Users see inactive placeholder tiles in their dashboard prompting them to add Instagram/TikTok

