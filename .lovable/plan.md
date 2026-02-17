
# Use Real Profile Data in Hero Mockup

## Overview

Replace the fake "Alex Rivera" demo profile in the landing page hero with a real-looking mockup based on Jorge's actual TapAway profile (`tapaway.co/jorge`). This makes the hero far more convincing because visitors can tap through to a real, live profile.

## What Changes

### PersonalHero.tsx — Complete phone mockup redesign

The phone screen currently shows a generic emoji avatar and fake links. It will be updated to mirror Jorge's real profile:

**Profile section:**
- Real profile photo from Jorge's Supabase storage URL
- Name: "Jorge Monroy"
- Bio: "Building TapAway — a faster way to share who you are."
- Dark background (#1a1a1a) matching his actual profile theme
- Banner image header (his actual header_type is "banner")

**Links section:**
- Instagram and TikTok shown as grid cards (half-width, side-by-side) with their real cover images from storage
- X (Twitter) shown as a pill-style link below the grid
- Social icon bar at the top (Instagram, TikTok, X icons with brand colors)

**Blocks section:**
- "START USING TAPAWAY" image block (his real CTA banner)
- Photo collage carousel preview (4 real photos)

**Handle badge:**
- Changed from `tapaway.co/alexrivera` to `tapaway.co/jorge`
- Add a "See it live" link/arrow that opens the real profile in a new tab

**Floating badges updated:**
- "Instant share" badge stays
- "5 links" badge updated to reflect actual link count ("3 links + collage")
- Optionally add a "Real profile" or "Live example" badge

### Visual fidelity improvements
- Banner image fades into the dark background naturally (matching ProfilePreviewRenderer behavior)
- Profile photo uses the real circular crop with ring styling
- Link cards use the same glassmorphism/dark-card styling as the real profile
- Grid layout for Instagram/TikTok cards matches the 2-column grid from the real renderer

## Technical Details

**File: `src/components/landing/personal/PersonalHero.tsx`**

All changes are contained in this single file. The phone mockup section (right column) will be rebuilt to:

1. Use Jorge's real Supabase storage URLs for profile photo, banner, and link cover images
2. Render a banner-style header that fades to dark background
3. Show social icon bar with brand-colored circles (Instagram gradient, TikTok pink/cyan, X black)
4. Render Instagram + TikTok as side-by-side grid cards with cover images
5. Render X as a standard pill link
6. Show a small collage preview row
7. Update the handle badge to `tapaway.co/jorge` with a clickable link to the live profile

No database changes, no new files, no dependency additions needed. All image URLs reference existing Supabase storage assets.
