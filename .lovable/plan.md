

# Fix Dark Mode on Main Landing Page (tapaway.co)

## Problem
Several landing page sections use hardcoded `bg-white` instead of the theme-aware `bg-background` or `bg-card` Tailwind classes. In dark mode, this creates white backgrounds with dark-themed text, making content unreadable.

## Affected Files and Changes

### 1. `src/components/landing/HeroSection.tsx`
- Line 29: `bg-white` -> `bg-background`
- Line 31: `from-white via-white to-muted/30` -> `from-background via-background to-muted/30`
- Line 137: Inner phone screen `bg-white` stays as-is (it's a phone mockup, should look like a real phone)
- Line 192: Analytics overlay `bg-white` -> `bg-card`
- Line 210: Done-for-you badge `bg-white` -> `bg-card`

### 2. `src/components/landing/DoneForYouSection.tsx`
- Line 30: `bg-white` -> `bg-background`

### 3. `src/components/landing/ComparisonSection.tsx`
- Line 49: TapAway column `bg-white` -> `bg-card`
- Line 81: Competitor column `bg-white` -> `bg-card`

### 4. `src/components/landing/QRComparisonSection.tsx`
- Line 58: TapAway NFC card `bg-white` -> `bg-card`
- Line 87: QR Code card `bg-white` -> `bg-card`

### 5. `src/components/landing/HowItWorksNew.tsx`
- Line 33: Section `bg-white` -> `bg-background`
- Line 63: Step cards `bg-white` -> `bg-card`

### 6. `src/components/landing/RiskReversalSection.tsx`
- Line 12: Section `bg-white` -> `bg-background`

### 7. `src/components/landing/ProofSection.tsx`
- Line 61: Result cards `bg-white` -> `bg-card`
- Line 114: Highlight pill `bg-white` -> `bg-card`

### 8. `src/components/landing/FAQSection.tsx`
- Line 82: Accordion items `bg-white` -> `bg-card`

## Approach
- `bg-white` on **section** backgrounds becomes `bg-background` (maps to the page-level background, dark-mode aware)
- `bg-white` on **cards/overlays** becomes `bg-card` (maps to card surface, dark-mode aware)
- Sections using `bg-muted/30` and semantic classes like `bg-foreground` are already dark-mode safe -- no changes needed
- The phone mockup screen in HeroSection keeps `bg-white` intentionally (it's simulating a real phone screen)

This is a straightforward find-and-replace of hardcoded color classes with their semantic equivalents that are already defined in the CSS variables.
