

# Copy Real Hub Layouts + Revamped "How It Works" Section

## Overview

Two changes to the card onboarding page (`/c/:code`):

1. **"Copy This Layout" on real hub examples** -- When users browse the showcase of real hubs, each card gets a "Copy Layout" button. Tapping it fetches that profile's links, blocks, and style settings from the database and stores them as a dynamic layout template in sessionStorage. During signup, these are applied exactly like the existing hardcoded templates -- the user just fills in their own info.

2. **Revamped informational section** -- Replace the generic "How It Works" 3-step section with a more educational, benefit-driven section that explains what an NFC card is, what a personal hub does, and highlights the one-tap contact saving feature (no account needed for the person receiving it).

---

## 1. Copy Layout from Real Hubs

### How it works

- `HubShowcase` already fetches profiles from `personal_profiles_public`
- Expand the query to also fetch each profile's `personal_links` and `personal_blocks` (public data, RLS allows anon select)
- Add a "Copy Layout" button on each showcase card
- When tapped, store the profile's layout structure (link types, labels, display styles, block types, content templates, header style, colors) in sessionStorage as `tapaway_copied_layout`
- The signup flow (`PersonalSignup.tsx`) already reads from sessionStorage and applies templates -- extend it to also check for `tapaway_copied_layout` with the same apply logic

### Data fetched per showcase profile

From `personal_profiles_public`: `header_type`, `header_color`, `background_color`

From `personal_links` (joined by profile_id): `link_type`, `label`, `display_style`, `grid_size`, `is_featured`, `sort_order`, `pill_color` -- but NOT the actual `url`, `cover_image_url`, or `thumbnail_url` (those are personal)

From `personal_blocks` (joined by profile_id): `block_type`, `sort_order`, `alignment` -- but NOT `content` (replace with placeholder content based on block type)

### Changes to HubShowcase.tsx

- Expand the Supabase query to also fetch links and blocks for each profile (two additional queries by profile IDs)
- Add a "Copy Layout" button below each profile card (replaces the "View" link, or sits alongside it)
- On click: serialize the layout data into sessionStorage under `tapaway_copied_layout` as a JSON object matching the `LayoutTemplate` interface shape
- Show a toast confirmation "Layout copied! Activate your card to use it."
- Visual feedback: selected card gets a teal border/checkmark (similar to LayoutTemplates component)

### Changes to PersonalSignup.tsx

- After the existing `tapaway_selected_layout` check, add a second check for `tapaway_copied_layout`
- If found, parse the JSON and apply links/blocks/style the same way hardcoded templates are applied
- Clear from sessionStorage after applying

---

## 2. Revamped Informational Section

### Replace the current "How It Works" with two sections:

**Section A: "What Is This Card?"** -- Educational section for NFC newcomers
- Heading: "What Is This Card?"
- 3 info cards in a vertical stack:
  1. Icon: Smartphone with tap indicator. Title: "It's a smart card". Description: "This card has a tiny chip inside. When someone holds their phone near it, your personal hub opens instantly -- no app needed."
  2. Icon: Globe/Link. Title: "Your hub, your rules". Description: "Your hub is a single page with all your links, social profiles, photos, and contact info. Update it anytime -- your card always points to the latest version."
  3. Icon: UserPlus/Contact. Title: "One-tap contact saving". Description: "Anyone who visits your hub can save your name, phone, and email straight to their contacts with one button. They don't need an account or an app."

**Section B: "How to Get Started"** -- Quick 3-step process (kept brief)
- Step 1: "Activate your card" -- "Enter your email and set a password"
- Step 2: "Pick a layout or copy one" -- "Start from a template or copy a hub you like"
- Step 3: "Share it everywhere" -- "Tap your card, text your link, or show your QR code"

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/card/HubShowcase.tsx` | Fetch links/blocks per profile, add "Copy Layout" button, store in sessionStorage, visual selection state |
| `src/components/card/CardOnboarding.tsx` | Replace "How It Works" section with "What Is This Card?" educational section + brief "How to Get Started" steps |
| `src/pages/personal/PersonalSignup.tsx` | Add `tapaway_copied_layout` sessionStorage check alongside existing template check |

## Technical Details

- The copied layout stored in sessionStorage uses the same shape as `LayoutTemplate` from `layoutTemplates.ts`, making the apply logic identical
- Personal data (URLs, images, content text) is stripped from copied layouts -- only structure is copied (link types, labels, block types, sort order, styles)
- Block content is replaced with placeholder text based on block type (e.g., text block gets "Add your own text here", image block gets empty url with "Add your photo" caption)
- RLS on `personal_links` and `personal_blocks` already allows public reads for active profiles, so no migration needed
- The "Copy Layout" action also triggers the "Activate Now" flow since the user needs to sign up to use it

