

# Affiliate Trial Fix + Default Banner + Tutorial Update + Shop Tab

## Issues Found

1. **Affiliate trial not tracking**: `verify-personal-checkout` always sets `subscription_status: 'active'` -- it never checks if Stripe's subscription has a trial period. The `referred_by` field is only set client-side in `PersonalSignupComplete.tsx`, which works, but the trial status is wrong. Sonia's profile shows `subscription_status: active` with no `trial_ends_at` and no `referred_by`.

2. **Default header is "color"**: New profiles get `header_type: 'color'` -- should default to `'banner'` (Full Banner).

3. **"Auto match to photo" is display-only**: The ambient color preview in the Design tab is informational but not clickable.

4. **Tutorial references removed Card tab**: The last coach mark step says "Want a physical card? Check the Card tab!" which no longer exists.

5. **Plan tab doesn't show trial status**: `PersonalBillingTab` has no awareness of trial state -- it shows "Pro $10/month" regardless.

6. **No Shop button**: Users have no way to purchase physical NFC cards.

---

## 1. Fix Affiliate Trial Detection

**File: `supabase/functions/verify-personal-checkout/index.ts`**

After retrieving the Stripe session, check if the subscription has a trial:

```
const subscription = session.subscription as Stripe.Subscription;
let subscriptionStatus = 'active';
let trialEndsAt = null;

if (subscription?.status === 'trialing' && subscription?.trial_end) {
  subscriptionStatus = 'trialing';
  trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
}
```

Use `subscriptionStatus` and `trialEndsAt` when inserting/updating the profile instead of hardcoded `'active'`. This covers both the affiliate Stripe link (which has a 2-week trial) and any future trial-enabled links.

---

## 2. Default New Profiles to Full Banner

**File: `supabase/functions/verify-personal-checkout/index.ts`**

When inserting a new profile, change `header_type` default from omitted (which defaults to `'color'` in the DB) to `'banner'`:

```
header_type: 'banner',
```

**File: `src/pages/personal/PersonalSignupComplete.tsx`**

In the profile update step (Step 6), set:

```
header_type: savedData.headerType || "banner",
```

Instead of `"color"`.

---

## 3. Make "Auto Match to Photo" Clickable

**File: `src/components/personal/DashboardDesignTab.tsx`**

The ambient color preview block (lines 477-488) currently just displays. Wrap it in a clickable button that triggers `handleBgColorChange(generateAmbientGradient(imageBasedColor))`:

- Add a cursor pointer and hover effect
- Add text like "Tap to apply" or make the whole row clickable
- Also show this option when NOT in banner mode but with a profile photo, so any user with a photo can auto-match

---

## 4. Update Welcome Tutorial Steps

**File: `src/components/personal/WelcomeCoachMarks.tsx`**

Update `COACH_STEPS` to remove Card tab reference and reflect current layout:

```typescript
const COACH_STEPS = [
  {
    id: "welcome",
    targetId: "profile-header",
    title: "Welcome to TapAway!",
    message: "This is your digital profile. Tap your photo to customize it.",
    position: "bottom",
  },
  {
    id: "links",
    targetId: "tab-links",
    title: "Add Your Links",
    message: "Connect social profiles, websites, and anything you want to share.",
    position: "bottom",
  },
  {
    id: "design",
    targetId: "tab-design",
    title: "Customize Your Look",
    message: "Choose colors, upload a header image, or enable full-screen banner mode.",
    position: "bottom",
  },
  {
    id: "share",
    targetId: "profile-url",
    title: "You're All Set!",
    message: "Share your profile link anywhere -- on social media, email, or in person.",
    position: "top",
  },
];
```

---

## 5. Show Trial Status in Plan Tab

**File: `src/components/personal/PersonalBillingTab.tsx`**

Add `trial_ends_at` to the component's profile prop interface.

When `subscription_status === 'trialing'` and `trial_ends_at` exists:

- Show badge as "Pro Trial" instead of "Pro"
- Show "Free trial until [date]" instead of "$10/month"
- After trial ends (or for active paid users), show the normal "$10/month Pro Plan" view
- Remove the "Custom NFC card" line from the Pro features list (line 256) since cards are now in Shop

Also pass `trial_ends_at` from `PersonalDashboard.tsx` into the component.

---

## 6. Add Shop Tab

**File: `src/pages/personal/PersonalDashboard.tsx`**

Add a "Shop" tab to the TabsList (6th column, `grid-cols-6`):

```
<TabsTrigger value="shop">
  <ShoppingBag className="h-4 w-4" />
  Shop
</TabsTrigger>
```

Add corresponding `TabsContent` with a new `PersonalShopTab` component.

**File: `src/components/personal/MobileBottomNav.tsx`**

Add Shop entry to `BASE_MORE_TABS`:

```
{ value: "shop", label: "Shop", icon: ShoppingBag, description: "Get a physical NFC card" },
```

**New file: `src/components/personal/PersonalShopTab.tsx`**

A simple shop page with two product cards:

1. **Basic NFC Card** -- $10 one-time
   - Pre-designed TapAway card
   - Tap to share your profile instantly
   - "Coming Soon" or link to Stripe payment

2. **Custom NFC Card** -- $25 one-time
   - Upload your own design
   - Your name and branding
   - Premium materials

Each card includes:
- Product image placeholder
- Price
- "Why go physical?" benefits section: "Share without Wi-Fi", "Make a lasting impression", "Works with any smartphone"
- CTA button (can link to a Stripe payment link or show "Coming Soon")

---

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/verify-personal-checkout/index.ts` | Detect Stripe trial status, set `trialing` + `trial_ends_at`; default `header_type: 'banner'` |
| `src/pages/personal/PersonalSignupComplete.tsx` | Default `header_type` to `'banner'` |
| `src/components/personal/DashboardDesignTab.tsx` | Make ambient color preview clickable |
| `src/components/personal/WelcomeCoachMarks.tsx` | Update steps to remove Card references |
| `src/components/personal/PersonalBillingTab.tsx` | Show trial status, remove NFC card from features |
| `src/pages/personal/PersonalDashboard.tsx` | Add Shop tab, pass `trial_ends_at` to billing |
| `src/components/personal/MobileBottomNav.tsx` | Add Shop to More menu |
| `src/components/personal/PersonalShopTab.tsx` | **NEW** -- Shop page with NFC card products |
| `src/lib/personalPlanLimits.ts` | Remove `nfcCard` from feature lists |

