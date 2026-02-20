

# End-to-End Flow Testing + Premium Feature Indicators in Hub Showcase

## Overview

All current showcase profiles use premium features (banner/image headers, some have 6+ links). Users on the free plan who copy these layouts will hit limitations silently. This plan adds clear premium indicators and sorts free-friendly hubs first.

## Changes

### 1. Add premium feature detection and badges to HubShowcase (HubShowcase.tsx)

**What**: For each profile in the showcase, determine if it uses premium features:
- Header type is "image" or "banner" (free only gets "color")
- More than 5 links (free limit)

**How**:
- Fetch `plan_type` alongside other profile fields from `personal_profiles_public`
- Also fetch link count per profile (already fetched, just count them)
- Sort profiles: free-compatible first, premium last
- Add a small "Pro" badge on cards that use premium features
- When copying a premium layout on a free plan, show a toast explaining some features require Pro

### 2. Sort showcase profiles (HubShowcase.tsx)

Profiles with `header_type === "color"` AND `<= 5` links appear first. Others follow with a subtle "Pro" indicator.

### 3. Premium copy warning (HubShowcase.tsx)

When `handleCopyLayout` is called on a profile that uses premium features, the toast message changes to: "Layout copied! Some features need Pro to display fully." The layout still copies -- nothing is blocked.

## Technical Details

### File: `src/components/card/HubShowcase.tsx`

1. **Add `plan_type` to the query** (line 56): Add `plan_type` to the select fields from `personal_profiles_public`

2. **Add `plan_type` to ShowcaseProfile interface**: New optional field

3. **Compute premium flag per profile**: A helper function `usesPremiumFeatures(profile)` checks:
   - `header_type` is "image" or "banner"
   - `links.length > 5`

4. **Sort profiles after enrichment**: Free-compatible profiles first

5. **Render "Pro" badge**: Small pill on the card thumbnail for premium profiles

6. **Update copy toast**: Different message for premium vs free-compatible layouts

### No other files need changes

The rest of the pipeline (PersonalSignup, LinksStep, CheckoutStep) already handles downgrade warnings and plan gating correctly -- the `checkProFeature` function in LinksStep and `getProFeaturesInUse` in CheckoutStep already warn about pro features when switching to free.
