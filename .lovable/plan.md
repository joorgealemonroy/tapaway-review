

# "Not on Google?" Website Fallback + Remove Shipping + Logo as Profile Photo

## Summary

Three changes to the onboarding info step:
1. Add a "Not on Google?" toggle that shows a manual website URL + business name input
2. Remove the shipping address section (Stripe collects it)
3. Pass the user-uploaded logo to magic-onboarding so it becomes the profile photo

## Changes

### 1. "Not on Google?" fallback (`src/pages/Onboarding.tsx`)

Below the Google Places search, add a clickable text: **"Not on Google yet?"**. When tapped:
- Hide the Google Places autocomplete
- Show two fields: **Business Name** (text) and **Website URL** (optional)
- The website URL gets passed to `magic-onboarding` so Brandfetch can still pull branding/logo
- A "Search Google instead" link to toggle back

State changes:
- New `notOnGoogle` boolean state
- New `websiteUrl` string state
- When `notOnGoogle` is true, user types business name manually and optionally provides a website

### 2. Remove shipping address section (`src/pages/Onboarding.tsx`)

- Delete the shipping address `<div>` block (lines ~962-972)
- Remove `shippingAddress` state variable and all references to it
- Remove `shippingAddress` from `saveOnboardingData()` calls
- Remove `step3Schema` shipping validation (only used in `OnboardingNew.tsx`)
- Clean up `onboardingData.ts` shipping fields from the interface (keep for backward compat but stop collecting)

### 3. Pass uploaded logo URL to magic-onboarding (`src/pages/Onboarding.tsx`)

When calling `magic-onboarding`, pass the uploaded `savedLogoUrl` so the edge function can use it as the profile photo instead of relying solely on Brandfetch:

```typescript
await supabase.functions.invoke("magic-onboarding", {
  body: {
    businessName: bName,
    address: placeAddress || '',
    placeId: placeId || undefined,
    userId: uid,
    email: session.user.email || '',
    username: magicUsername,
    logoUrl: savedLogoUrl || undefined,
    websiteUrl: websiteUrl || undefined,
  },
});
```

### 4. Accept logo + website in magic-onboarding (`supabase/functions/magic-onboarding/index.ts`)

- Add `logoUrl?: string` and `websiteUrl?: string` to `MagicOnboardingRequest`
- If `logoUrl` is provided, use it as `profile_photo_url` (skip Brandfetch logo)
- If `websiteUrl` is provided and Google didn't return a website, use it for Brandfetch and social scraping

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Onboarding.tsx` | Add "Not on Google?" toggle, remove shipping section, pass logoUrl + websiteUrl to magic-onboarding |
| `supabase/functions/magic-onboarding/index.ts` | Accept `logoUrl` and `websiteUrl` params, use them as overrides |

