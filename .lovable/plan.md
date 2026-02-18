

# Revamp Personal Signup: Full Profile Editing + Live Preview + Card Options

## Overview

The signup flow currently has 4 steps: Identity, Links (photo + links + blocks), Preview (card theme + reorder), Checkout. The changes restructure steps 2 and 3 so users can fully build their profile like they already own it, then see a real preview of their hub, and finally get optional card ordering.

## Current Flow vs. New Flow

```text
CURRENT:                          NEW:
1. Identity (name/email/pw)       1. Identity (same)
2. Links (photo + links + blocks) 2. Build Your Profile (photo + links + blocks + theme - all in one, like the dashboard editor)
3. Preview (card/theme + reorder) 3. Preview Hub + Card Options (live preview + optional card selection)
4. Checkout                       4. Checkout (same)
```

## Step 2: "Build Your Profile" (enhanced LinksStep)

Keep the current LinksStep mostly as-is -- it already supports photo upload, adding/reordering links, and blocks via BlocksManager. Move the theme customization (HeaderCustomizer for header color/image and background color) from PreviewStep into this step so users can set everything in one place.

### Changes to `src/components/personal/signup/LinksStep.tsx`:
- Import and add the `HeaderCustomizer` component at the bottom of the form (before the navigation buttons)
- Add a "Customize Theme" collapsible section containing:
  - HeaderCustomizer (header color/image picker)
  - Background color picker
  - Card headline input
- This makes step 2 feel like a full profile editor

## Step 3: "This is your TapAway" (completely redesigned PreviewStep)

Replace the current PreviewStep with two sections:

### Section A: Live Hub Preview
- Use the existing `ProfilePreviewPanel` component (the phone-frame preview used in the dashboard) to show exactly what the public profile will look like
- Pass the signup form data formatted as the ProfilePreviewRenderer expects
- This gives the user a real, accurate preview of their hub

### Section B: Card Options (Optional)
- Present card ordering as fully optional with a clear "Not now" path
- Three card options displayed as selectable cards:

  1. **Custom Card** -- Their profile photo + name + info printed on the card
     - Shows a mini preview of TapAwayCardPreview
     - Price: included with Pro / $15 add-on for Free
  
  2. **Basic Card** -- Plain colored card with "tapaway.co" centered
     - Color picker with 5 options: Yellow, Green, Pink, Red, Grey
     - Each shown as a small color swatch the user taps to select
  
  3. **No card** -- "Not now" option, clearly labeled, not hidden
     - Subtitle: "You can always order one later from your dashboard"

- Each card option has a small "More info" button/link that expands (or shows a sheet/dialog) explaining:
  - "Why get a physical card?"
  - Benefits: instant contact sharing with a tap, no app needed, works with any phone, professional first impression, never run out of business cards

### Technical changes to `src/components/personal/signup/PreviewStep.tsx`:
- Remove the current inline profile preview rendering (the manual header/avatar/links layout)
- Remove the drag-and-drop reorder logic (moved to step 2 or unnecessary since LinksStep handles it)
- Remove the theme settings collapsible (moved to step 2)
- Import `ProfilePreviewPanel` and render it with form data mapped to the expected shape
- Add new card selection state: `cardChoice: 'custom' | 'basic' | 'none'` (default: 'none')
- Add `basicCardColor` state for the 5 color options
- Add a `moreInfoOpen` state for the benefits dialog
- Pass `cardChoice` and `basicCardColor` up via `updateFormData` so checkout can use them
- Keep the existing TapAwayCardPreview for the "Custom Card" option preview

### Data model additions to `SignupData` and `usePersonalOnboarding`:
- Add `cardChoice: 'custom' | 'basic' | 'none'` (default: `'none'`)
- Add `basicCardColor: string | null` (default: `null`)
- These fields are added to both `PersonalOnboardingData` in `usePersonalOnboarding.ts` and `SignupData` in `PersonalSignup.tsx`

## Step Title Updates in `PersonalSignup.tsx`

```text
Step 2: "Build your profile" (was "What do you want to share?")
Step 3: "This is your TapAway" (unchanged)
```

## Files to Modify

1. **`src/hooks/usePersonalOnboarding.ts`** -- Add `cardChoice` and `basicCardColor` to the data interface and initial state
2. **`src/pages/personal/PersonalSignup.tsx`** -- Add new fields to `SignupData`, update step 2 title, pass theme props to LinksStep
3. **`src/components/personal/signup/LinksStep.tsx`** -- Add theme customization section (HeaderCustomizer + background color + card headline)
4. **`src/components/personal/signup/PreviewStep.tsx`** -- Complete rewrite: ProfilePreviewPanel for hub preview + card option selector with Custom/Basic/None choices + More Info dialog

## Card Option UI Details

The three options are presented as tappable cards in a vertical stack:

- **Custom Card**: Shows a scaled-down TapAwayCardPreview, label "Custom Card" with subtitle "Your photo, name & QR code". Has a checkmark ring when selected.
- **Basic Card**: Shows 5 color circles (Yellow #FFD93D, Green #6BCB77, Pink #FF6B9D, Red #FF6B6B, Grey #9CA3AF) with "tapaway.co" text in the center preview. Selecting this reveals the color picker.
- **Not now**: Simple text option "I'll skip the card for now" with muted styling. Subtitle: "You can order one anytime from your dashboard."

Below all three, a small link: "Why get a card?" that opens a bottom sheet (on mobile) or dialog explaining benefits.

