

# Fix Banner Access for Free Users, Tap-Enabled Indicator & Profile Readability

## Issues

1. **Free users can get "Full Banner" header** — When copying a Pro layout from HubShowcase, the `banner` headerType is applied without plan checks. The `LinksStep` blocks banner selection in the UI, but the template application in `PersonalSignup.tsx` bypasses this.

2. **"Tap-enabled" shows for all profiles** — Should only appear when the user has an active NFC card linked to their account.

3. **Footer text still unreadable on light backgrounds** — The previous fix may not have fully applied, or the `isDarkBg` logic incorrectly returns `true` for white/light profile photos used as banners.

## Plan

### 1. Downgrade banner to "color" for free users during signup

**File: `src/pages/personal/PersonalSignup.tsx` (~line 184)**

When applying a copied/template layout, check if the user is on a free plan. If so, force `headerType` to `"color"` instead of `"banner"` or `"image"`:

```typescript
const effectiveHeaderType = 
  (!isPaidPlan && !isVipCard && (template.headerType === "banner" || template.headerType === "image"))
    ? "color"
    : template.headerType;

update({
  headerType: effectiveHeaderType,
  headerColor: template.style.headerColor,
  backgroundColor: template.style.bgColor,
});
```

Also add the same guard in `PersonalSignupComplete.tsx` (the account creation step) as a server-side fallback — if `plan_type` is `free`, force `header_type` to `"color"`.

### 2. Conditionally show "Tap-enabled" only for NFC card users

**File: `src/hooks/useProfileData.ts`**

Add an NFC card check to the parallel queries — query `nfc_cards` for any card owned by the profile's `user_id` with status `"active"`:

```typescript
// Add to parallel fetch
supabase.from('nfc_cards')
  .select('id')
  .eq('owner_user_id', profileData.user_id)
  .eq('status', 'active')
  .limit(1)
```

Return a `hasActiveCard: boolean` field in the profile data.

**File: `src/pages/personal/PersonalProfilePage.tsx` (~line 1320)**

Only render the "Tap-enabled" indicator when `data.hasActiveCard` is true.

### 3. Verify footer readability fix

**File: `src/pages/personal/PersonalProfilePage.tsx`**

The `isDarkBg` logic on line 1027 sets `isDarkBg = true` when `hasBanner` is true. For a white profile photo used as banner, the banner IS light — so `isDarkBg` should NOT default to `true` just because `hasBanner` is set.

Fix: Use the extracted banner luminance instead of blindly assuming banners are dark:

```typescript
// Line 1027 — replace
const isDarkBg = hasBanner 
  ? (bannerLuminance !== null ? bannerLuminance < 0.6 : true)  // use actual luminance, fallback dark
  : (isGradientBg ? isColorDark(getBaseColorFromGradient(bgColor)) : isColorDark(bgColor));
```

This requires checking what `bannerLuminance` or `extractedBannerColor` luminance is available. The extracted banner color is already computed — I need to derive luminance from it.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/personal/PersonalSignup.tsx` | Force free users' headerType to "color" when applying templates |
| `src/pages/personal/PersonalSignupComplete.tsx` | Server-side guard: free plan → header_type "color" |
| `src/hooks/useProfileData.ts` | Add NFC card active check, return `hasActiveCard` |
| `src/pages/personal/PersonalProfilePage.tsx` | Conditionally show "Tap-enabled"; fix `isDarkBg` for light banners |

