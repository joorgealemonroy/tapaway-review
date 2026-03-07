

# Shop Tab Pro/VIP Gate + Cards Tab "Coming Soon"

## 1. Shop Tab — Lock for Free Users

**File: `src/pages/personal/PersonalDashboard.tsx`** (lines 738-746)

Pass `planType={profile.plan_type}` to `PersonalShopTab`.

**File: `src/components/personal/PersonalShopTab.tsx`**

- Add `planType` to the props interface
- At the top of the render, if `planType === 'free'` or `planType` is null, show a locked preview instead of the full shop UI:
  - ShoppingBag icon + "Sell Digital Products" heading
  - Brief description of what creators can sell (courses, PDFs, templates)
  - 3-4 bullet points showing capabilities (Stripe payouts, download links, sales dashboard)
  - A prominent "Upgrade to Pro" button that triggers the existing `ProUpgradeDialog` or navigates to `/personal/pricing`
- Pro and VIP users see the full existing shop experience unchanged

## 2. Cards Tab — Replace with "Coming Soon"

**File: `src/components/personal/DashboardCardsTab.tsx`**

Replace the entire component body with a simple "coming soon" placeholder:
- CreditCard icon
- "NFC Cards — Coming Soon" heading
- Brief teaser text about tapping to share your profile
- No functional card management (remove all the load/edit/disable logic)

This is a clean swap — the tab stays visible but shows a static placeholder.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/personal/PersonalShopTab.tsx` | Add `planType` prop, render locked preview for free users |
| `src/components/personal/DashboardCardsTab.tsx` | Replace with "Coming Soon" placeholder |
| `src/pages/personal/PersonalDashboard.tsx` | Pass `planType` to `PersonalShopTab` |

