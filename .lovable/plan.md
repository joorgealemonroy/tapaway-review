

# Redesign Hero Section — Premium, 14-Day Trial Aligned

## Changes to `src/components/landing/HeroSection.tsx`

### 1. Trust Badge (pill) — move above headline
- Keep "Trusted by 150+ businesses nationwide" in a pill badge
- Move it to sit directly above the headline (already positioned there, just clean up text: "nationwide" not "nation wide")

### 2. Headline
- Change to: **"Turn Taps into 5-Star Reviews."**
- Use `font-black` weight, apply Electric Blue (`text-primary`) accent to "5-Star"

### 3. Sub-headline
- Replace with: "Grow your Google presence with high-performance Branded NFC Cards. We ship your custom kit today. Zero setup. **$0 Today.**"
- Bold "$0 Today" for emphasis

### 4. Remove old content
- Remove "Value Expansion" paragraph (lines 66-68)
- Remove "Trust Points" row with Truck/Shield icons (lines 71-80)
- Remove "NFC Card Customization" line mentioning "unbranded" (lines 83-86)
- Remove bottom micro-copy mentioning "30 days" (lines 115-118)

### 5. Buttons
- **Primary**: "Start My 14-Day Sprint" — Electric Blue background (`bg-primary text-primary-foreground`), keep ArrowRight icon
- **Secondary**: "Watch a 30-Sec Demo" — outline style (`border border-primary text-primary`), Play icon

### 6. 3D Card Visual (right side)
- Keep existing `TapAwayCard3D` component
- Keep rotating city social proof below it
- No changes needed to the 3D component itself (already renders branded card SVGs)

### File modified
- `src/components/landing/HeroSection.tsx`

