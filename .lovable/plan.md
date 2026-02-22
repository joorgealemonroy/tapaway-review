

# Fix Dark Mode on Personal Landing Page

## Problem
The previous dark mode fix only addressed the Business landing page components. The Personal landing page (`/personal`) — which is what you're currently viewing — still has hardcoded `bg-white` backgrounds, making text unreadable in dark mode.

## Changes

### 1. `src/components/landing/personal/PersonalHero.tsx`
- Line 56: `bg-white` -> `bg-background`
- Line 57: `from-white via-white` -> `from-background via-background`

### 2. `src/components/landing/personal/PersonalHowItWorks.tsx`
- Line 32: Section `bg-white` -> `bg-background`
- Line 61: Step cards `bg-white` -> `bg-card`

### 3. `src/components/landing/personal/PersonalUseCases.tsx`
- Line 73: Use case cards `bg-white` -> `bg-card`

### 4. `src/components/landing/personal/PersonalFAQ.tsx`
- Line 44: Section `bg-white` -> `bg-background`

All other text and border classes already use theme-aware tokens (`text-foreground`, `text-muted-foreground`, `border-border`), so fixing these backgrounds will resolve the readability issue.
