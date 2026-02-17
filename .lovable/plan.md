

# Mobile-First Hero: CTA Above Profile

## Overview

Restructure the PersonalHero into a single-column, mobile-first, centered layout where the headline and CTA buttons appear **above** the phone mockup. On desktop (lg+), it scales up gracefully but the stacked layout remains.

## Layout (single file: `src/components/landing/personal/PersonalHero.tsx`)

### Structure (top to bottom, all centered)

1. **Badge pill** -- "Share Everything in One Tap"
2. **Headline** -- "One link for everything." (text-2xl on mobile, scaling up)
3. **Subtitle** -- One-liner with "Set up in under 2 minutes" bolded. Fold "works on any phone" into copy, remove separate pill icons.
4. **CTA buttons** -- Two buttons side by side:
   - Primary: "Get Your TapAway" (large, dark, full-width on mobile, auto on desktop)
   - Secondary: "See a Live Profile" (outline style, links to tapaway.co/jorge in new tab)
5. **Trust line** -- "Free plan available - Pro from $6.25/mo"
6. **Phone mockup** -- Jorge's profile (same content, bumped to max-w-[300px] on mobile, max-w-[340px] on md+)
7. **Handle badge** -- tapaway.co/jorge with live link

### Key changes

- Remove `lg:grid-cols-2` two-column grid -- replace with `flex flex-col items-center text-center`
- Remove `lg:text-left`, `lg:justify-start` -- everything centered
- Remove the separate "Works on any phone" and "Set up in minutes" feature pills
- Remove floating side badges (they clip on mobile) -- replace with a single subtle badge below the phone or remove entirely
- Buttons stack full-width on mobile (`w-full sm:w-auto`), sit side by side on sm+
- Add subtle background: `bg-gradient-to-b from-primary/5 via-transparent to-transparent`
- Reduce `min-h-[90vh]` to `min-h-screen` or remove min-height entirely and let content dictate height with generous padding (`py-16 md:py-24`)
- Phone mockup entrance animation changes from `x: 30` (slide from right) to `y: 30` (slide up from below)

### Mobile-specific polish

- Headline: `text-2xl` base, `md:text-4xl lg:text-5xl`
- Subtitle: `text-sm md:text-base` with tighter max-width
- Primary CTA: `w-full sm:w-auto px-8 py-4 text-base` with glow shadow
- Secondary CTA: `w-full sm:w-auto` outline button
- Phone mockup: `max-w-[280px] sm:max-w-[320px] md:max-w-[340px]`
- Compact vertical spacing: `gap-4` on mobile, `gap-6` on md+

