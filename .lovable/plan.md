

# Hide Physical Card References (Personal Only) + Affiliate Flow + Dashboard Integration

## Important Scope Note

All card-related removals apply **only to the Personal product**. The business dashboard (`Dashboard.tsx`), business landing page (`Index.tsx`), and all business components remain completely untouched.

---

## 1. Hide Card References from Personal Signup & Landing

### `src/components/personal/signup/CheckoutStep.tsx`
- Remove NFC card mentions from `proFeatures`: "1 custom TapAway NFC card included", "FREE Card Stand included", "Free shipping"
- Replace with digital features: "Custom profile URL", "Priority support"
- Remove card text from plan buttons: "Includes NFC card + FREE stand", "Includes custom NFC card"
- Remove "No NFC card included" from `freeFeatures`
- Remove extra card toggle and pricing logic
- Change CTA from "Get My TapAway Card" to "Create My TapAway"

### `src/components/personal/signup/SuccessScreen.tsx`
- Remove "Your card is being prepared" and "Tap to share in person" next steps
- Change subtitle to "Your profile is live!"
- Replace with digital next steps: "Share your link", "Update links anytime", "Track your views"

### `src/pages/personal/PersonalPricing.tsx`
- Remove `PersonalCard3D` card preview component
- Remove trust badges (Free shipping, Ships in 1-2 days)
- Remove "Card Stand" yearly bonus section
- Remove "Physical card included" callout
- Rewrite pro features list to focus on digital features
- Update hero text to focus on profile sharing, not physical card

### `src/components/landing/personal/PersonalHero.tsx`
- Remove "Custom NFC Card Included" badge
- Remove "Free shipping", "Ships in 1-2 days" trust points
- Remove `PersonalCard3D` component and card visual
- Update headline/CTA to focus on digital profile
- Change CTA from "Get Your Custom NFC Card" to "Get Your TapAway"

### `src/pages/personal/PersonalSignup.tsx`
- Remove the "Custom NFC card included" and "Free shipping" badges from the header area

---

## 2. Hide Card References from Personal Dashboard

### `src/pages/personal/PersonalDashboard.tsx`
- Remove the "Card" tab from desktop TabsList
- Remove the entire Card TabsContent section
- Remove the Card Confirmation Modal
- Remove all card-related state variables (`sendingCardApproval`, `showCardConfirmModal`, `editableCardName`, etc.)
- Remove `handleConfirmCardDesign` callback
- Remove card-related imports (`TapAwayCardPreview`, `RequestMoreCards`, etc.)

### `src/components/personal/MobileBottomNav.tsx`
- Remove the "Card" entry from `MORE_TABS`
- Remove `hasCardNotification` prop and notification dot logic

---

## 3. Affiliate-Referred Users Get a Dedicated Paywall

### New: `src/components/personal/signup/AffiliatePaywall.tsx`
- Single-page paywall for users arriving via `?ref=USERNAME`
- Collects: Full Name, Email, Username (with availability check), Password
- "Start your free 2-week trial" messaging
- Digital-only value props (profile page, unlimited links, analytics)
- Single CTA: saves data to sessionStorage, redirects to affiliate Stripe link (`https://buy.stripe.com/dRm8wP7tZ4vpby11AegYU0f`)
- No plan selection, no card content
- Trust indicators and Terms/Privacy links

### `src/pages/personal/PersonalSignup.tsx`
- Detect `tapaway_ref` in sessionStorage or `?ref=` in URL on mount
- If present, render `AffiliatePaywall` instead of the normal wizard

---

## 4. Signup Redirects to Dashboard (All Personal Users)

### `src/pages/personal/PersonalSignupComplete.tsx`
- After successful profile creation, redirect to `/personal/dashboard?welcome=true`
- Skips SuccessScreen, triggers existing `WelcomeCoachMarks` tutorial
- User immediately sees their real dashboard

---

## 5. Affiliate Button on Personal Dashboard

### `src/pages/personal/PersonalDashboard.tsx`
- Import `useAffiliateAccess` hook
- Conditionally render "Affiliate" button in header if `isAffiliate` is true
- Clicking navigates to `/affiliate`

### `src/components/personal/MobileBottomNav.tsx`
- Accept optional `isAffiliate` prop
- If true, add "Affiliate" entry (Users icon) to `MORE_TABS`

---

## What Is NOT Touched

- `src/pages/Dashboard.tsx` (business dashboard) -- no changes
- `src/pages/Index.tsx` (business landing) -- no changes
- `src/components/dashboard/*` (business components) -- no changes
- `src/components/landing/HeroSection.tsx` etc. -- no changes
- Business card ordering, review hubs, onboarding -- no changes

---

## Implementation Order

1. Create `AffiliatePaywall.tsx`
2. Update `PersonalSignup.tsx` (affiliate detection + remove card badges)
3. Remove card refs from `CheckoutStep.tsx` and `SuccessScreen.tsx`
4. Remove card tab/modal from `PersonalDashboard.tsx`
5. Update `MobileBottomNav.tsx` (remove card, add affiliate)
6. Update `PersonalPricing.tsx` and `PersonalHero.tsx` (remove card content)
7. Update `PersonalSignupComplete.tsx` (redirect to dashboard)
8. Add affiliate button to dashboard header
