

# Fix Dark Mode Readability on Personal Pricing Page

## Problem
The `/personal/pricing` page uses hardcoded light-mode colors (`from-teal-50`, `via-white`, `to-white`, `bg-teal-100`, `bg-teal-50`) that become unreadable in dark mode — text disappears, backgrounds clash, and the page looks broken.

## Changes

### 1. `src/pages/personal/PersonalPricing.tsx`
- Replace `from-teal-50 via-white to-white` background with theme-aware classes: `from-primary/5 via-background to-background`
- Replace `shadow-teal-200/50` with `shadow-primary/20`
- Replace `bg-teal-100` icon circles with `bg-primary/10`
- Replace `text-teal-600` with `text-primary`
- Replace `hover:text-teal-700` with `hover:text-primary/80`
- Replace `bg-teal-600 hover:bg-teal-700` CTA buttons with `bg-primary hover:bg-primary/90`

### 2. `src/components/card/LayoutTemplates.tsx`
- Replace `bg-teal-50/50` selected state with `bg-primary/10`
- Replace `text-teal-600 bg-teal-50` badge with `text-primary bg-primary/10`
- Replace `border-teal-500` and `bg-teal-500` with `border-primary` and `bg-primary`

### 3. `src/components/card/HubShowcase.tsx`
- Replace `border-teal-500` with `border-primary`
- Replace `bg-teal-500` with `bg-primary`

All changes swap hardcoded Tailwind color values for semantic theme tokens that adapt to both light and dark mode automatically.

