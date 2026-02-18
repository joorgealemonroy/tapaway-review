

# Improve Mobile UX, Card Preview, and Plan Switching in Signup Flow

## 1. Make "Build Your Profile" (LinksStep) more phone-friendly with explanations

### Current problem
- Sections like "Your links," "Blocks," and "Customize Theme" have no descriptions explaining what they are
- The collapsible theme section is easy to miss
- Touch targets on link items could be larger

### Changes to `src/components/personal/signup/LinksStep.tsx`
- Add short helper text below each section heading:
  - **Profile photo**: "This photo appears on your profile and physical card" (already partially there)
  - **Your links**: Add subtitle "Add your social media, website, or any link you want to share. People see these when they visit your profile."
  - **Blocks**: Add subtitle "Add extra content like text, images, YouTube videos, or buttons to make your profile stand out."
  - **Customize Theme**: Add subtitle "Change colors and style to match your brand or personality."
- Make the "Customize Theme" section default to open (change `useState(false)` to `useState(true)`) so users don't miss it
- Increase touch targets: link item rows get `min-h-[56px]` and action buttons get `p-3 -m-1` for 44px targets
- Add `touch-action: manipulation` to draggable items to prevent zoom on double-tap

## 2. Fix basic card to credit card size

### Current problem
The basic card preview in PreviewStep is `w-full h-24` -- too short and not realistic.

### Changes to `src/components/personal/signup/PreviewStep.tsx`
- Replace `w-full h-24` with `w-full aspect-[85.6/53.98]` (standard credit card ratio, landscape orientation)
- This gives the card a realistic credit-card shape
- Also apply the same aspect ratio styling to the custom card preview area for consistency

## 3. Plan switching on Checkout without going back to step 1

### Current problem
The "Change" button in the locked plan summary navigates to `/personal/pricing`, which exits the signup flow entirely. When plan is not locked, switching plans works inline but there's no warning about Pro features becoming unavailable when downgrading to free.

### Changes to `src/components/personal/signup/CheckoutStep.tsx`

**A. Fix the "Change" button (planLocked mode):**
- Replace `navigate("/personal/pricing")` with inline plan selection
- When user clicks "Change," expand the plan selection UI inline (toggle `planLocked` behavior off temporarily) so they can pick a new plan without leaving the flow
- Add a local state `showPlanSelector` that overrides `planLocked` display

**B. Add downgrade warning when switching from paid to free:**
- When user selects "Free" after previously having "monthly" or "yearly," check their signup data for Pro-only features:
  - Custom header image (`headerType === "image"`)
  - More than 5 links
  - Pro-only blocks (photo collage, email capture)
- If any Pro features are in use, show an AlertDialog warning:
  - Title: "Some features will be removed"
  - Body: List the specific features that will be lost (e.g., "Custom header image will revert to solid color," "Links beyond 5 will be removed")
  - Primary CTA: "Switch to Free anyway" -- downgrades and strips pro features from formData
  - Secondary: "Keep Pro plan" -- cancels the switch
- If no Pro features are in use, switch silently

**C. Pricing display consistency:**
- Already shows "$6.25/month" with "Billed annually $75" -- keep this as-is

### Changes to `src/pages/personal/PersonalSignup.tsx`
- Pass a new `onChangePlan` callback to CheckoutStep that updates the plan without resetting the step
- The `planLocked` prop becomes overridable from within CheckoutStep via local state

## Files to modify

1. **`src/components/personal/signup/LinksStep.tsx`** -- Add section descriptions, open theme by default, increase touch targets
2. **`src/components/personal/signup/PreviewStep.tsx`** -- Fix basic card to credit card aspect ratio
3. **`src/components/personal/signup/CheckoutStep.tsx`** -- Inline plan switching (no navigation away), downgrade warning dialog when switching from paid to free
4. **`src/pages/personal/PersonalSignup.tsx`** -- Minor: ensure planLocked doesn't prevent inline changes

