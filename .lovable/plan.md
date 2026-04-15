

# Magic Onboarding: Auto-Page Generator

## Summary
Build a "Magic Onboarding" system with a premium loading overlay and a backend edge function that auto-generates a professional profile/dashboard by fetching brand assets from Google Places + Brandfetch, with graceful fallbacks when API keys are missing.

---

## Architecture

```text
User submits business name + address
        │
        ▼
  ┌─────────────────────┐
  │  Magic Loading UI   │  (full-screen overlay with cycling status text)
  │  4 animated phases  │
  └────────┬────────────┘
           │ POST /magic-onboarding
           ▼
  ┌─────────────────────────────────────────┐
  │  magic-onboarding Edge Function         │
  │  1. Google Places → placeId + website   │
  │  2. Brandfetch → logo + brand colors    │
  │  3. Social discovery (if key available) │
  │  4. Insert personal_profiles + links    │
  └────────┬────────────────────────────────┘
           │ returns { profileId, username }
           ▼
  Redirect → /dashboard?welcome=true
```

---

## Phase 1: Database Changes

**Add column** to `personal_links`:
- `thumbnail_bg_url TEXT` — scraped social post image used as tile background

No other schema changes needed — `personal_profiles` already has `background_color`, `profile_photo_url` (for logo), `header_color`, `text_color`, `button_theme`.

---

## Phase 2: Edge Function — `magic-onboarding`

**File**: `supabase/functions/magic-onboarding/index.ts`

Accepts: `{ businessName, address, placeId?, userId, email, planType, dashboardType }`

Steps:
1. **Google Places** — use existing `GOOGLE_PLACES_API_KEY_SERVER` to get Place ID (if not already provided), website URL, and business photos
2. **Brandfetch** — if `BRANDFETCH_API_KEY` secret exists, call `https://api.brandfetch.io/v2/brands/{domain}` to get logo URL + brand colors. If key missing → default black background, no logo
3. **Social Discovery** — if `OUTSCRAPER_API_KEY` secret exists, search for Instagram/TikTok URLs. If missing → skip social tiles
4. **Media Scrape** — if social URLs found and scraper key exists, fetch 2 recent post images. If missing → use Google Places photos as fallback tile images
5. **DB Insert** — create `personal_profiles` record with brand colors, create `personal_links` records (Google Review, Instagram, TikTok, Website) with `thumbnail_bg_url` for social tiles

**Config**: `verify_jwt = true` (requires authenticated user)

Fallback defaults: black background (#0F172A), white text, no logo, standard link list without social tiles.

---

## Phase 3: Magic Loading UI

**File**: `src/components/onboarding/MagicLoadingOverlay.tsx`

- Full-screen dark overlay with centered content
- Animated TapAway logo at top
- Cycling text with fade transitions (2.5s per step):
  1. "Locating your Google Business Profile..."
  2. "Fetching your brand colors and logo..."
  3. "Pulling recent social media images..."
  4. "Designing your custom Tapaway hub..."
- Subtle progress bar advancing through 4 stages
- On edge function return → auto-redirect to `/dashboard?welcome=true`

---

## Phase 4: Integration into Onboarding Flows

### B2B Flow (`Onboarding.tsx`)
- After OAuth + restaurant creation, if `dashboardType === 'personal'`, call `magic-onboarding` and show the overlay instead of the current spinner
- For `dashboardType === 'restaurant'`, keep existing flow unchanged

### Personal Flow (`PersonalSignup.tsx`)
- After account creation step, call `magic-onboarding` with scraped data
- Show overlay during processing

---

## Phase 5: Pro Hub Template

**File**: `src/components/personal/ProHubTemplate.tsx`

A rendering component used by `PersonalProfilePage.tsx` when profile was created via magic onboarding (detected by a `template_type = 'pro'` value on the profile, or by presence of `thumbnail_bg_url` on social links).

Layout constraints enforced:
- **A. Background & Logo**: Solid brand color background. Logo in frosted glass container (`backdrop-blur-md`, `bg-white/10`, `rounded-2xl`, max-width constrained)
- **B. Social Tiles**: 2-column grid of `aspect-square` cards with `thumbnail_bg_url` as `object-cover` background, gradient overlay (black→transparent bottom→top), platform icon top-left, label bottom-center in bold white uppercase
- **C. Standard Links**: Full-width `rounded-xl` rectangles below tiles. Google Review gets white bg + dark text + Google G icon. Others get brand secondary color or dark grey with white text + arrow icon

---

## Phase 6: Dashboard Editing Constraints

In `DashboardUnifiedContent.tsx` / link editor:
- Social tile links with `thumbnail_bg_url` show an image swap button but lock grid_size to `half` and display_style to `card`
- Prevent changing structural layout for pro-template links
- Allow swapping background image only

---

## Files Changed/Created

| File | Action |
|------|--------|
| `supabase/functions/magic-onboarding/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| `src/components/onboarding/MagicLoadingOverlay.tsx` | Create |
| `src/components/personal/ProHubTemplate.tsx` | Create |
| `src/pages/Onboarding.tsx` | Integrate overlay for personal dashboard type |
| `src/pages/personal/PersonalSignup.tsx` | Integrate overlay |
| `src/pages/personal/PersonalProfilePage.tsx` | Use ProHubTemplate when applicable |
| `src/components/personal/DashboardUnifiedContent.tsx` | Lock social tile editing |
| DB migration | Add `thumbnail_bg_url` to `personal_links` |

---

## API Keys Needed (with fallbacks)

- `BRANDFETCH_API_KEY` — optional, falls back to black bg + no logo
- `OUTSCRAPER_API_KEY` — optional, falls back to no social discovery
- `GOOGLE_PLACES_API_KEY_SERVER` — already configured

The edge function gracefully degrades at each step. Without any external keys, users still get a clean dark-themed profile with their Google Review link.

