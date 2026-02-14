

# Update Yelp Link & Instagram Deep Linking

## 1. Update Yelp URL for Las Islas Marias OG

Update the database record for Las Islas Marias OG (id: `1d83b669-e326-4231-a8d1-686630915073`) to use the correct Yelp link:
`https://www.yelp.com/biz/las-islas-marias-los-angeles?osq=las+islas+marias`

## 2. Instagram Deep Linking

Currently, Instagram links are stored as regular web URLs (e.g., `https://instagram.com/Islasmariaog64`). When tapped on mobile, this opens in the browser instead of the Instagram app.

The URL validation in the settings already transforms Instagram URLs to the `instagram://user?username=...` deep link format on save. However, the public Review Hub page blocks these deep links because its safety check (`isSafeUrl`) only allows `http:` and `https:` protocols.

**Changes:**

- **ReviewHub.tsx** -- Update the `isSafeUrl()` function to also allow the `instagram://` protocol, so deep links render correctly on the public page.
- **Database** -- Update the Instagram URL for Las Islas Marias OG from `https://instagram.com/Islasmariaog64` to `instagram://user?username=Islasmariaog64` so it opens the app directly.

## Technical Details

**File: `src/pages/ReviewHub.tsx`** (line 178)
- Change `isSafeUrl` to accept `instagram://` in addition to `http:` and `https:`

**Database migration:**
- Update `yelp_review_url` for restaurant `1d83b669-e326-4231-a8d1-686630915073`
- Update `instagram_url` for the same restaurant to deep link format

Note: Other restaurants with `https://instagram.com/...` links will continue to work (they pass `isSafeUrl` as-is), but they won't open the Instagram app directly until their URLs are also converted to deep link format. This will happen automatically the next time their settings are saved through the dashboard.

