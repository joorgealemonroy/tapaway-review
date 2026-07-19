## Rep Demo Editor — Draft/Submit + Trial-Wide Tab Gating (Corrected)

### Scoping rules (final)
- `const isRepDemo = !!profile.sales_rep_id && !profile.is_approved;`
- `const isTrialing = profile.subscription_status === 'trialing';`
- Rep-only features → `isRepDemo`
- Trial-restriction features → `isTrialing` (covers all trial users, including rep demos)

### 1. Rep-editing banner + Draft/Submit controls (`isRepDemo` only)
Sticky sub-header under the main header in `PersonalDashboard.tsx`:
- Left: "Editing demo hub — **{business name}**" + pipeline chip (Draft / Ready for review / Approved).
- Right buttons:
  - **Save draft** → `pipeline_status='draft'`, toast, stay.
  - **Submit for review** → `pipeline_status='ready_for_review'`, `submitted_for_review_at=now()`, toast, redirect to `/rep/restaurants`.
  - If already `ready_for_review` → "Awaiting admin approval" + **Recall to draft** button.

`AdminPendingHubApprovals.tsx` will filter to `pipeline_status='ready_for_review'` so drafts stay hidden.

### 2. Tab gating for ALL trialing profiles (`isTrialing`)
In `PersonalDashboard.tsx` desktop tab list and `MobileBottomNav.tsx`:
- **Hide "Cards" tab entirely** when `isTrialing`.
- **Hide "Switch Profile" dropdown/button entirely** when `isTrialing` (desktop dropdown + mobile Switch Profile section).
- **Keep "Shop" tab** but render a locked state inside `PersonalShopTab`: existing explainer copy retained, Stripe-Connect connect UI replaced with a disabled "Connect Stripe — available after activation" button + note "You'll connect payouts once you activate a plan."
- Inside the **Plan** tab, add a small upsell pill: "Card Club — unlocks with any paid plan."

Non-trialing (active/paid) users see everything exactly as today.

### 3. SMS copy change (all users)
In `src/components/personal/SmsMarketingTab.tsx` and `src/components/restaurant/RestaurantSmsMarketingTab.tsx`, replace every "Mass texting will be unlocked in a few days" with **"Will be unlocked very soon."**

### 4. Full Banner–only Design tab (`isRepDemo` only)
Pass an `isRepDemo` prop from `PersonalDashboard.tsx` → `DashboardDesignTab` → `HeaderCustomizer.tsx`:
- Regular owners: keep Solid Color / Image / Full Banner radio group unchanged.
- When `isRepDemo`: hide the radio group entirely, force `headerType='banner'` on mount if not already, and render only the banner explainer + logo upload + Page Background controls.

### 5. DB migration
Add `submitted_for_review_at timestamptz` (nullable) to `personal_profiles`. `pipeline_status` already accepts free-text values, so no enum change needed; `'ready_for_review'` slots in directly.

### Files touched
- `src/pages/personal/PersonalDashboard.tsx` — banner (rep-only), tab gating (trial), pass `isRepDemo` down
- `src/components/personal/HeaderCustomizer.tsx` — accept `isRepDemo`, banner-only when true
- `src/components/personal/DashboardDesignTab.tsx` — forward `isRepDemo`
- `src/components/personal/PersonalShopTab.tsx` — locked Stripe-connect state when `isTrialing`
- `src/components/personal/PersonalBillingTab.tsx` (Plan tab) — Card Club upsell pill when `isTrialing`
- `src/components/personal/SmsMarketingTab.tsx` + `src/components/restaurant/RestaurantSmsMarketingTab.tsx` — copy change
- `src/components/personal/MobileBottomNav.tsx` — hide Cards + Switch Profile when trialing
- `src/components/admin/AdminPendingHubApprovals.tsx` — filter `pipeline_status='ready_for_review'`
- New migration: `submitted_for_review_at` column on `personal_profiles`

### Out of scope
- No change to owner behavior for active/paid accounts (they see Cards, Switch Profile, full Design options, full Shop).
- No change to legacy Business (restaurant) dashboard tabs.
