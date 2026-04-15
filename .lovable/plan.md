

# Fix Magic Onboarding: Logo, Socials, and Photo Tiles

## Problems Found

1. **No profile photo**: Brandfetch is skipped because Tacos El Guero has no website in Google Places. The function never falls back to using a Google Places photo as the profile picture.

2. **No Instagram/TikTok**: `discoverSocials()` is a stub — it returns empty despite `OUTSCRAPER_API_KEY` being configured. The Google Places API (v1) also supports returning social media links via the `websiteUri` field mask, but we're not requesting them.

3. **Blank tile images**: The thumbnail URLs use the Google Places media endpoint with the API key inline. These URLs likely fail to load in the browser because the Places API media endpoint returns a redirect that requires proper headers, or the key has HTTP referrer restrictions. The images need to be downloaded server-side and re-uploaded to Supabase Storage.

## Implementation

### 1. Fetch social links from Google Places API
The Google Places API (New) supports field masks like `googleMapsLinks` and also embeds social profiles. Update the `X-Goog-FieldMask` to include `googleMapsUri` for directions. For Instagram/TikTok, we can attempt Outscraper's Google Maps API which returns social media profiles.

### 2. Implement Outscraper social discovery
The `OUTSCRAPER_API_KEY` is already configured. Use Outscraper's Google Maps enrichment API to fetch social profiles for the business by place ID. This returns Instagram, TikTok, Facebook, etc. URLs.

### 3. Download and re-upload Google photos to Supabase Storage
Instead of storing raw Google Places media URLs (which expire or get blocked), download the photos server-side and upload them to the `personal-photos` bucket. Use the resulting public URLs for `thumbnail_bg_url`.

### 4. Use first Google photo as profile photo fallback
When Brandfetch returns no logo (no website), use the first Google Places photo as the `profile_photo_url`.

### 5. Hard-code known social links as fallback matching
For cases where Outscraper doesn't return socials, attempt a simple Instagram/TikTok URL probe using the business slug (e.g., `tacos.el.guero.fontana`). This is a best-effort enhancement.

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/magic-onboarding/index.ts` | Implement Outscraper social fetch, photo re-upload to storage, profile photo fallback from Google |

## Technical Details

**Outscraper API call** (using place ID):
```
GET https://api.app.outscraper.com/maps/search-v3?query=place_id:ChIJk9NuMWJNw4ARzKokimctM54&fields=instagram,tiktok,facebook
```

**Photo re-upload flow**:
1. Fetch photo binary from Google Places media URL (server-side, no referrer issues)
2. Upload to `personal-photos` bucket as `{profileId}-tile-{index}.jpg`
3. Use the Supabase public URL as `thumbnail_bg_url`

**Profile photo fallback**:
- If Brandfetch returns no logo AND Google has photos, use the first re-uploaded photo as `profile_photo_url`

