

# Redesign Card Activation Landing — Keep HubShowcase, Remove LayoutTemplates

## Changes to `src/components/card/CardOnboarding.tsx`

### Hero (above the fold)
- Keep the animated color-cycling card visual
- Rewrite headline: "You just got a smart card" with subtext "Tap it. Your page opens. All your links, one place."
- Enlarge CTA button to `h-14 text-lg` with subtle pulse animation on mount
- Trust line: "Free · 3 minutes · No app needed"

### Benefits section (replace current INFO_CARDS)
Rewrite to 3 outcome-focused benefit rows:
1. "Share everything with one tap" — All your links, socials, payments in one page
2. "Let anyone save your contact instantly" — One button saves your info to their phone
3. "See who's checking you out" — Track views and clicks with Pro analytics

### Keep HubShowcase
- Keep the real profile showcase with "Copy Layout" buttons (drives Pro trial conversions)
- Move it below the benefits section

### How to Get Started
- Keep 3 steps but tighten copy to be benefit-driven

### Remove LayoutTemplates
- Remove the "Pick a Layout" grid entirely from this page (it's available during signup)

### Bottom CTA
- Keep final activate button with trust text

### Page flow order:
1. Hero + big CTA
2. 3 benefit rows
3. HubShowcase (Pro social proof)
4. How to Get Started (3 steps)
5. Mid CTA
6. Bottom CTA

**File**: `src/components/card/CardOnboarding.tsx` — rewrite content and layout, remove LayoutTemplates import

