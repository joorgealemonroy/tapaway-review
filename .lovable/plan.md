

# Redesign /socials as Hybrid Hub + Landing Page

## Overview
Replace the current generic hero with a hardcoded TapAway profile hub at the top, then seamlessly transition into conversion sections below. The entire page uses a black background (`bg-black`) for cohesion — the hub section looks like a real profile, then fades into marketing content.

## Page Structure

```text
┌─────────────────────────────────────────┐
│  BLACK BACKGROUND (no nav at top)       │
│                                         │
│  ① LIVE HUB (hardcoded profile)         │
│  - Circular tapaway.co logo + ✓ badge   │
│  - "TapAway" name + @socials handle     │
│  - Instagram / X / TikTok icon row      │
│  - Bio text                             │
│  - White "Save Contact" button          │
│  - Dark pill link cards (IG, X, TT, ✉)  │
│                                         │
│  ② TRANSITION CTA                       │
│  - Pitch text + white "Try It Free →"   │
│  - "No credit card required"            │
│                                         │
│  ③ DEMO SECTION (bg-zinc-950)           │
│  - "See real businesses using TapAway"  │
│  - Dropdown: Bakery/Barbershop/etc      │
│  - Phone mockup iframe                  │
│  - "Visit live profile" link            │
│                                         │
│  ④ FEATURES GRID (bg-black)             │
│  - "Everything in one place"            │
│  - 6 dark cards, cyan/primary icons     │
│                                         │
│  ⑤ FOOTER CTA (bg-white, dark text)     │
│  - "Ready to try it?"                   │
│  - Dark "Try It Free →" button          │
│  - "No credit card required · Cancel…"  │
└─────────────────────────────────────────┘
```

## Changes

| File | Action |
|------|--------|
| `src/pages/Socials.tsx` | **Rewrite** — Replace hero with hardcoded hub section matching real profile styling, keep existing demo/features/footer sections with adjusted backgrounds |

## Hub Section Details
- **No LandingNav** at top — the page opens directly as a profile
- Profile photo: `/tapaway-logo.svg` in a white circle with a blue verified checkmark (CheckCircle2 icon)
- Name: "TapAway" bold white, handle: "@socials" in white/50
- Social icons row: 3 circles (Instagram gradient, X black, TikTok black) — using existing icon components from `platformLinks.tsx`
- Bio: italic white/70 text
- "Save Contact" button: full-width white rounded pill with UserPlus icon
- Link cards: 4 dark glassmorphism pills (`bg-white/10 backdrop-blur-md border border-white/10`) for Instagram, X, TikTok, and Connect (email) — each with the platform icon circle and ExternalLink arrow

## Transition
- Subtle gradient fade from hub into marketing section
- CTA uses the same dark bg, white button styling

## Existing Sections (kept, restyled)
- Demo dropdown + phone mockup: moved to `bg-zinc-950` for seamless blend
- Features grid: dark cards on black bg with cyan icon circles
- Footer: white bg with dark text and dark CTA button (inverted from current)

