

# Magic Importer — High-Conversion Import Flow

Redesign the `/import` page into a compelling "before vs. after" experience that scrapes the user's existing bio-link, shows an animated loading sequence, renders a split-screen comparison, and drives signup with a single CTA.

## Architecture

The existing `ImportProfile.tsx` page and `scrape-link-bio` edge function provide the foundation. The scraper already handles Linktree, Stan Store, Beacons, lnk.bio, bio.link, and Campsite. We'll add `hoo.be` support to the scraper's allowed domains and enhance the frontend UX significantly.

## Changes

### 1. Edge Function: Add Hoo.be Support
**File**: `supabase/functions/scrape-link-bio/index.ts`
- Add `'hoo.be'` to `ALLOWED_DOMAINS` array
- The generic anchor-based extractor already handles unknown platforms, so no additional scraper logic needed

### 2. Rewrite ImportProfile.tsx — "Magic Importer" UX
**File**: `src/pages/personal/ImportProfile.tsx`

**A. Animated Loading State** (replaces spinner)
- 3-phase progress bar with text transitions:
  1. "Analyzing your profile..." (0–40%)
  2. "Fetching your aesthetic..." (40–75%)
  3. "Building your TapAway..." (75–100%)
- Uses `useEffect` interval to animate progress while `isLoading` is true
- Subtle shimmer/pulse animation on the progress container

**B. Split-Screen "Before vs After" Preview** (replaces single card)
- Two side-by-side phone mockups (stacked on mobile):
  - **Left ("Before")**: Renders scraped data in a generic/plain style — muted colors, basic list of links, small avatar, plain background. Labeled with source platform name (e.g., "Your Linktree").
  - **Right ("After")**: Renders same data in TapAway's signature dark theme — rounded pill links with platform icons, social icon row, gradient header, polished avatar. Labeled "Your TapAway".
- Both mockups are contained in a phone-frame `div` with rounded corners and subtle shadow

**C. "Claim my Page" CTA**
- Large gradient button: "This looks better — Claim my Page"
- Replaces the old "Use This Layout" button
- Same `handleUseLayout` logic (stores data in sessionStorage, navigates to `/personal/signup`)
- Secondary link: "Start fresh instead"

**D. Social Icon Row in Preview**
- Social links rendered as a horizontal row of circular icon badges (matching TapAway profile style) in the "After" preview
- Content links rendered as rounded pill buttons with platform-specific icons

**E. Source Detection Badge**
- After scraping, show a small badge: "Imported from Linktree" (detected from hostname)

### 3. Styling Approach
- All styling via Tailwind classes (no new CSS files)
- Phone mockup frames: `rounded-[2.5rem] border-[6px] border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden aspect-[9/16] max-h-[500px]`
- "Before" uses muted/gray tones; "After" uses the app's dark theme with primary accent colors
- Progress bar uses the existing `Progress` component with custom styling
- Responsive: side-by-side on desktop (`md:grid-cols-2`), stacked on mobile

## Component Structure

```text
ImportProfile.tsx
├── Header (logo + "Start Fresh" link)
├── Title Section ("Bring your links to TapAway")
├── URL Input Form (unchanged logic)
├── Supported Platforms chips (hidden after result)
├── Loading State (animated 3-phase progress)
└── Result State
    ├── Source Badge ("Imported from Linktree")
    ├── Split Preview
    │   ├── BeforePreview (plain/generic render)
    │   └── AfterPreview (TapAway-styled render)
    ├── CTA Button ("This looks better — Claim my Page")
    └── "Start fresh" link
```

## Files Modified
- `supabase/functions/scrape-link-bio/index.ts` — add `hoo.be` to allowed domains
- `src/pages/personal/ImportProfile.tsx` — full rewrite with Magic Importer UX

