

# Update Affiliate Onboarding Copy and Add CTA to Showcase

## Changes

### 1. Update Hero Headline (line 76-78)

Change from:
> Your digital hub -- one link for everything

To a two-line treatment:
> **All Your Links, One TapAway**
> One link for everything

The main headline becomes "All Your Links, One TapAway" (bold, large), and "One link for everything" becomes the subtitle/subtext below it.

### 2. Add "Create yours free" button next to Hub Showcase header (lines 101-109)

Below the "Real Hubs, Real People" section heading (rendered by the `HubShowcase` component), add a small secondary CTA button like "Create yours -- free" or a text link that navigates to signup. Since the heading is inside `HubShowcase`, we'll add this button right after the `HubShowcase` component, styled to feel like it belongs to that section.

## Technical Details

**File:** `src/components/affiliate/AffiliateOnboarding.tsx`

- **Line 76-78**: Replace the `<h1>` content with "All Your Links, One TapAway" and move "One link for everything" to the `<p>` subtitle (replacing or combining with the existing "Set up in about 3 minutes" text).
- **Lines 102-109**: After the `<HubShowcase>` component, add a small centered button/link like:
  ```
  <button onClick={goToSignup} className="...">
    Create yours — free →
  </button>
  ```
  Styled as a text-style link (teal, small, centered) so it doesn't compete with the main CTAs but gives an action point right after seeing the examples.
