

# Reorganize Card Onboarding Page for Maximum Conversion

## Problem

The current page has good content but the order works against conversion. A user lands and sees:
1. Hero + CTA
2. "What Is This Card?" (3 cards of text)
3. "How to Get Started" (3 steps)
4. Real Hubs (buried deep)
5. Layout Templates (buried deeper)
6. Bottom CTA

By the time they reach the social proof (real hubs), they may have already bounced. The heavy text sections create a wall that feels like homework before they can even see what they would get.

## New Funnel Order

The reorganization follows a proven landing page psychology: **Desire first, then logic, then action.**

**New order:**

1. **Hero** -- Keep as-is but tighten the subtitle to emphasize speed and zero friction: "Takes 30 seconds. Free. No app needed." Add a small "Scroll to see examples" nudge below the CTA for users who aren't ready to commit yet.

2. **Real Hubs** (moved UP from position 4) -- Show social proof immediately. "See what yours could look like" creates desire and answers "what am I getting?" before they have to read anything. Seeing real people using it is more convincing than any explanation.

3. **3-Step "How to Get Started"** (kept brief, moved above the info section) -- This answers the objection "is this going to be complicated?" with just 3 short lines. Positioned here because after seeing the hubs they want to know "how do I get that?"

4. **Mid-page CTA** -- A second "Activate Now" button right after the steps. Users who are convinced by the hubs + simplicity can convert here without scrolling further.

5. **Layout Templates** -- For users still browsing, show them they can pick a pre-made layout. This further reduces perceived effort.

6. **"What Is This Card?"** (moved DOWN from position 2) -- The educational content is now last, for users who genuinely don't understand NFC. Most users who tapped the card already know what happened -- they don't need this explained first.

7. **Bottom CTA** -- Final conversion point with trust signals.

**New addition: Sticky bottom CTA bar** -- A slim, fixed bar at the bottom of the screen with "Activate Now" so users can convert at any scroll position without hunting for a button. It fades in after the user scrolls past the hero CTA.

## Changes to `CardOnboarding.tsx`

1. Reorder sections: Hero, HubShowcase, Steps, mid-CTA, LayoutTemplates, Info Cards, bottom CTA
2. Add a sticky bottom bar component (appears on scroll past hero)
3. Add "scroll to see examples" text hint below hero CTA with a small down-arrow
4. Add a mid-page CTA between the steps section and layout templates
5. Tighten hero subtitle copy

## Technical Details

### File: `src/components/card/CardOnboarding.tsx`

- Reorder the JSX sections (no new data, just moving existing blocks around)
- Add a `useEffect` + `useState` to track scroll position for the sticky bar visibility
- Add a `useRef` on the hero CTA to detect when it scrolls out of view (IntersectionObserver)
- Sticky bar: fixed bottom, teal background, "Activate Now" button, slides up with framer-motion
- The sticky bar includes "Free -- 30 seconds" text beside the button

No other files need to change -- this is purely a layout/ordering change within a single component.

