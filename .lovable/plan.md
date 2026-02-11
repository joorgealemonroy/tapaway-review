

# Multiple Dashboard Fixes

## 1. Remove default "Tap to Connect & Collaborate" headline

New profiles should have an empty headline instead of the pre-filled text.

**Files to change:**
- `supabase/functions/verify-personal-checkout/index.ts` -- change `metadata.card_headline || null` to just `null` for the `headline` field (line 210)
- `src/pages/personal/PersonalSignupComplete.tsx` -- change `savedData.cardHeadline || null` to `null` for `headline`, and `savedData.cardHeadline || "Tap to Connect &\nCollaborate"` to `savedData.cardHeadline || null` for `card_front_headline` (lines 208, 212)
- `src/hooks/usePersonalOnboarding.ts` -- change default `cardHeadline` from `"Tap to Connect &\nCollaborate"` to `""` (line 61)
- `src/components/personal/signup/AffiliatePaywall.tsx` -- same default change (line 80)
- `src/components/personal/signup/CheckoutStep.tsx` -- remove the fallback `"Tap to Connect &\nCollaborate"` on both occurrences (lines 297, 601)
- `src/components/personal/signup/PreviewStep.tsx` -- remove the fallback in value/placeholder (lines 195-197)

## 2. Fix coach/tutorial targeting for mobile bottom nav

The tutorial targets `tab-links` and `tab-design` which only exist on desktop (hidden `md:grid`). On mobile, the bottom nav buttons have no IDs.

**Files to change:**
- `src/components/personal/MobileBottomNav.tsx` -- add `id="mobile-nav-links"` to the Links button and `id="mobile-nav-design"` to the Design button
- `src/components/personal/WelcomeCoachMarks.tsx` -- make the "links" step try `mobile-nav-links` first, fall back to `tab-links`; same for "design" step. Change position to `"top"` for these mobile nav targets since they're at the bottom of the screen. Also update the "share" step to use `"bottom"` position when targeting `profile-url` (which is near the top).

## 3. Scroll to top when switching to Design tab

**File: `src/pages/personal/PersonalDashboard.tsx`**
- In the `setActiveTab` handler (or wrap it), add `window.scrollTo({ top: 0, behavior: 'smooth' })` when switching tabs.

## 4. Mask billing email in Billing tab

Instead of showing the full billing email like `supajor@icloud.com`, show it masked: `su****r@******.com`.

**File: `src/components/personal/PersonalBillingTab.tsx`**
- Add a `maskEmail` helper function that masks the local part (keep first 2 and last 1 chars) and domain (all asterisks except the TLD)
- Use masked email in the display, with a tooltip or note explaining it's the billing email

## 5. Fix "Manage Subscription" button to use static Stripe URL

Currently the button calls the `manage-personal-subscription` edge function. It should simply open `https://billing.stripe.com/p/login/bJe9AT3dJe5Z31vbaOgYU00` directly.

**File: `src/components/personal/PersonalBillingTab.tsx`**
- Replace `handleManageSubscription` with a simple `window.open(STRIPE_PORTAL_URL, "_blank")`
- Remove the `stripe_customer_id` disabled condition
- Remove the `isOpeningPortal` loading state

## 6. Remove "Downgrade to Free" button

**File: `src/components/personal/PersonalBillingTab.tsx`**
- Remove the entire `AlertDialog` block for downgrading (lines 184-230)
- Remove `handleDowngrade` function and `isDowngrading` state
- Clean up unused imports (`AlertDialog*`, `Loader2` if no longer needed)

---

## Technical Summary

| File | Changes |
|------|---------|
| `supabase/functions/verify-personal-checkout/index.ts` | Remove default headline on profile creation |
| `src/pages/personal/PersonalSignupComplete.tsx` | Remove default headline fallback |
| `src/hooks/usePersonalOnboarding.ts` | Empty default cardHeadline |
| `src/components/personal/signup/AffiliatePaywall.tsx` | Empty default cardHeadline |
| `src/components/personal/signup/CheckoutStep.tsx` | Remove headline fallbacks (2 places) |
| `src/components/personal/signup/PreviewStep.tsx` | Remove headline fallback |
| `src/components/personal/MobileBottomNav.tsx` | Add IDs to nav buttons for tutorial targeting |
| `src/components/personal/WelcomeCoachMarks.tsx` | Mobile-aware target resolution with fallback IDs |
| `src/pages/personal/PersonalDashboard.tsx` | Scroll to top on tab change |
| `src/components/personal/PersonalBillingTab.tsx` | Mask billing email, static Stripe URL, remove downgrade button |

