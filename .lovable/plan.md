

# Plan: Free Plan Limits + Pro Feature Upsell

## Summary
1. Raise free link limit from 5 to 10
2. Make email capture available on free plan
3. Add a soft upgrade prompt throughout the dashboard when free users interact with locked Pro features (custom header image, photo collage, advanced analytics, full-screen banner)

## Changes

### 1. Update plan limits (`src/lib/personalPlanLimits.ts`)
- Change `free.maxLinks` from `5` to `10`
- Change `free.features.emailCapture` from `false` to `true`
- Update `FEATURE_LIST` to reflect `10 links` for free and email capture included for free

### 2. Add `planType` prop to `DashboardUnifiedContent` and soft upgrade dialog
**File**: `src/components/personal/DashboardUnifiedContent.tsx`
- Accept `planType` as a new prop
- No changes needed here for block gating since BlockModal already shows all block types and email_capture will now be free

### 3. Pass `planType` and add upgrade dialog to `PersonalDashboard`
**File**: `src/pages/personal/PersonalDashboard.tsx`
- Pass `planType={profile.plan_type}` to `DashboardUnifiedContent`

### 4. Add Pro lock UI to `DashboardDesignTab`
**File**: `src/components/personal/DashboardDesignTab.tsx`
- Currently hides banner mode entirely for non-premium users (`{isPremium && (...)}`)
- Change to: always show banner option but with a small lock icon and "Pro" badge
- On click, show a gentle upgrade dialog instead of selecting it
- Same for custom header image upload — show it but lock it for free users

### 5. Create a reusable `ProUpgradeDialog` component
**File**: `src/components/personal/ProUpgradeDialog.tsx` (new)
- A gentle, non-pushy `AlertDialog` with:
  - Title: "Unlock [Feature Name]"
  - Body: "Try Pro free for 7 days — no charge today. Get unlimited links, custom headers, photo collages, and more."
  - Primary CTA: "Start Free Trial" → navigates to upgrade checkout (yearly plan with 7-day trial)
  - Secondary: "Maybe later" dismiss button
- Props: `open`, `onOpenChange`, `featureName`, `onUpgrade`

### 6. Wire upgrade dialog in BlockModal
**File**: `src/components/personal/BlockModal.tsx`
- Accept optional `planType` prop
- For `photo_collage` block type (the only remaining Pro-only block): show it in the list with a "Pro" badge
- On click, if free user, open `ProUpgradeDialog` instead of selecting the block type

### 7. Wire upgrade dialog in DashboardDesignTab
- Show banner mode and custom header image options to all users
- Add lock icon + "Pro" badge on those options for free users
- On click, open `ProUpgradeDialog`

### 8. Update `CheckoutStep.tsx` downgrade logic
**File**: `src/components/personal/signup/CheckoutStep.tsx`
- Update `maxFreeLinks` reference (already reads from `PERSONAL_PLANS.free.maxLinks`, so auto-updates)
- Remove `email_capture` from Pro-only block stripping on downgrade

### Files to create (1):
- `src/components/personal/ProUpgradeDialog.tsx`

### Files to modify (5):
- `src/lib/personalPlanLimits.ts` — limits + feature list
- `src/components/personal/BlockModal.tsx` — Pro badge on photo_collage for free users
- `src/components/personal/DashboardDesignTab.tsx` — show locked Pro options
- `src/pages/personal/PersonalDashboard.tsx` — pass planType, wire upgrade handler
- `src/components/personal/signup/CheckoutStep.tsx` — update downgrade stripping logic

