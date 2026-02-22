

# Redesign /personal/pricing to Match Referral Page Flow

## Overview
Replace the current minimal pricing page (`PersonalPricing.tsx`) with the same conversion funnel used in the referral/affiliate onboarding page (`AffiliateOnboarding.tsx`). The new page will follow the Hook -> Explain -> Action flow: animated hero card, Hub Showcase (real profiles), How It Works steps, Layout Templates, What Is a Hub explainer, and multiple CTAs throughout.

## What changes

The `PersonalPricing.tsx` file will be rewritten to mirror `AffiliateOnboarding.tsx` with these sections in order:

1. **Hero** -- Animated color-cycling card with "All Your Links, One TapAway" headline and "Create My Hub" CTA button
2. **Hub Showcase** -- Real customer profiles carousel (reuses `<HubShowcase />` component), with "Copy Layout" functionality
3. **How It Works** -- 3-step numbered list (Pick a username, Add your links, Share it everywhere)
4. **Mid-page CTA** -- "Create My Hub" button
5. **Layout Templates** -- Free starter templates grid (reuses `<LayoutTemplates />` component)
6. **What Is a Hub?** -- 3 info cards explaining the product (all links in one place, one-tap contact saving, works everywhere)
7. **Bottom CTA** -- Final "Create My Hub" button with "Free to start" reassurance

## Key differences from AffiliateOnboarding
- No `refCode` prop needed -- CTAs navigate to `/personal/signup` directly (no `?ref=` param)
- Same teal color scheme and gradient background
- Same components reused: `HubShowcase`, `LayoutTemplates`
- Header removed (the referral page doesn't have a nav header either -- clean single-page feel)

## Technical details

### File: `src/pages/personal/PersonalPricing.tsx`
- Remove old imports (Check, ArrowRight, Button toggle logic, plan/billing state)
- Import `HubShowcase` from `@/components/card/HubShowcase`
- Import `LayoutTemplates` from `@/components/card/LayoutTemplates`
- Import motion icons: `Globe`, `UserPlus`, `Share2`, `ChevronDown`, `User`, `Link2`, `QrCode` from lucide-react
- Copy the same section structure and constants (INFO_CARDS, STEPS) from `AffiliateOnboarding.tsx`
- CTA buttons navigate to `/personal/signup` (no ref param)
- Keep the same staggered `motion` animations and scroll-to-section behavior
