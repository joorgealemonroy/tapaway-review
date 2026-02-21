

# Affiliate Landing Page -- Hub-Focused (No Card References)

## Overview

Create a dedicated landing experience for affiliate-referred visitors that focuses entirely on the **hub** (digital profile page) -- no mention of NFC cards, tapping, or physical products since those aren't for sale yet and these users won't know what a card is.

## New File: `src/components/affiliate/AffiliateOnboarding.tsx`

A standalone, mobile-first landing page with the same structure and visual polish as `CardOnboarding.tsx`, but rewritten around the hub concept.

### Section Order (Desire > Logic > Action)

1. **Hero** -- Animated color-cycling card visual (same as CardOnboarding), headline: "Your digital hub -- one link for everything", subtext: "Set up in about 3 minutes. Free. No app needed.", primary CTA: "Create My Hub"
2. **Hub Showcase** -- Reuse `HubShowcase` component (real profiles, "Copy Layout" buttons). The `onCopyLayout` callback navigates to `/personal/signup?ref=CODE` so the referral is preserved.
3. **How It Works** -- 3 steps reframed for hub users:
   - (1) Pick a username -- "Choose your unique tapaway.co/username"
   - (2) Add your links and info -- "Instagram, TikTok, payments, contact card -- all in one place"
   - (3) Share it everywhere -- "Text your link, post it in your bio, or show your QR code"
4. **Mid-page CTA** -- "Create My Hub"
5. **Layout Templates** -- Reuse `LayoutTemplates` component (starter templates)
6. **What Is a Hub?** -- Educational cards (same card-style layout as CardOnboarding's "What Is This Card?" section), but with hub-relevant content:
   - "All your links in one place" -- "Your hub is a single page with all your links, social profiles, photos, and contact info. Update it anytime."
   - "One-tap contact saving" -- "Anyone who visits your hub can save your name, phone, and email straight to their contacts. No app needed."
   - "Works everywhere" -- "Share your hub link in your Instagram bio, texts, email signatures -- anywhere you want people to find you."
7. **Bottom CTA** -- "Create My Hub" + "Free to start - No credit card required"

### Visual Style
- Same teal gradient background (`bg-gradient-to-b from-teal-50 via-white to-white`)
- Same `framer-motion` animations and staggered reveals
- Same max-width container (`max-w-sm mx-auto px-6 py-10`)
- Mobile-first, single-column layout

### CTA Behavior
- All "Create My Hub" buttons call `navigate(\`/personal/signup?ref=\${refCode}\`)`
- HubShowcase's `onCopyLayout` does the same (layout is saved to sessionStorage, then navigates to signup)

## Modified File: `src/pages/Personal.tsx`

- Import `useSearchParams` and the new `AffiliateOnboarding` component
- At the top of the component, check for `ref` query param
- If `ref` exists: save to `sessionStorage.tapaway_ref` and render `<AffiliateOnboarding refCode={ref} />` instead of the normal landing page
- Otherwise: render the existing landing page as-is

## Technical Details

### Props for AffiliateOnboarding

```text
interface Props {
  refCode: string;
}
```

### Key Differences from CardOnboarding

| Aspect | CardOnboarding | AffiliateOnboarding |
|--------|---------------|-------------------|
| Headline | "Your card is ready" | "Your digital hub -- one link for everything" |
| CTA text | "Activate Now" | "Create My Hub" |
| Card mention | NFC card, chip, tapping | None -- hub only |
| Target URL | Inline activation flow | /personal/signup?ref=CODE |
| Educational section | "What Is This Card?" | "What Is a Hub?" |
| Trust signal | "Around 3 minutes to set up" | "Set up in about 3 minutes" |

### Files

- **Create:** `src/components/affiliate/AffiliateOnboarding.tsx`
- **Modify:** `src/pages/Personal.tsx` (add ref check + conditional render)
