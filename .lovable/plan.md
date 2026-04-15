

# Unify Trials to 14 Days and Update All Copy

## Problem
1. Trial durations are inconsistent across tiers and pages.
2. Landing page and other pages reference "30 days free" everywhere.
3. Marketing CTA in profile renderers still has old copy.

## Changes

### 1. Unify trial durations

**Stripe trial = 14 days, Total trial = 21 days (includes 7-day shipping buffer)**

**`src/lib/personalConfig.ts`** — Change `trialDays: 7` → `trialDays: 14`

**`src/pages/Onboarding.tsx`** (line 28-29) — Update both plans:
- Solo: `trialDays: 14, totalTrialDays: 21`
- Venue: `trialDays: 14, totalTrialDays: 21`

**`supabase/functions/create-checkout-session/index.ts`** (lines 12-14) — Both plans to `trialDays: 14`

**`supabase/functions/create-rep-checkout/index.ts`** — All four tiers to `trialDays: 14`

**`supabase/functions/create-rep-onboarding/index.ts`** — Both plans to `trialDays: 14`

### 2. Update all "30 days" copy to "14 days"

| File | Current | Updated |
|------|---------|---------|
| `ComparisonSection.tsx` | "Free 30-day trial" | "Free 14-day trial" |
| `RiskReversalSection.tsx` | "30 full days" | "14 full days" |
| `RiskReversalSection.tsx` | "before day 30" | "before day 14" |
| `RiskReversalSection.tsx` | "Start Free 30-Day Trial" | "Start Free 14-Day Trial" |
| `FinalCTA.tsx` | "Cancel anytime before day 30" | "Cancel anytime before day 14" |
| `FooterCTA.tsx` | "free 30-day trial" | "free 14-day trial" |
| `Paywall.tsx` | "Free 30-Day TapAway Trial" | "Free 14-Day TapAway Trial" |
| `Paywall.tsx` | "30-day free trial" | "14-day free trial" |
| `OnboardingNew.tsx` | "free 30-day TapAway trial" | "free 14-day TapAway trial" |
| `OnboardingNew.tsx` | "30-day free trial" | "14-day free trial" |
| `OnboardingNew.tsx` | "free 30-day trial" | "free 14-day trial" |
| `OnboardingSuccess.tsx` | "Trial active (30 days)" | "Trial active (14 days)" |
| `TrialConfirmed.tsx` | "free 30-day trial" / "before day 30" | "free 14-day trial" / "before day 14" |
| `send-cards-shipping-email` | "Free 30-day trial" / "before day 30" | "Free 14-day trial" / "before day 14" |

### 3. Fix marketing CTA copy in profile renderers

**`ProfilePreviewRenderer.tsx`** and **`PersonalProfilePage.tsx`**:
- "Try It Free" → "Try It Free with your logo"
- "We'll send you cards that tap" → "We'll cover shipping"

