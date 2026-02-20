
# Ensure All Signup Data Persists to the Hub

## Problem

When users build their profile during signup, several fields are silently dropped when the data is saved to the database. This affects links (images, colors, display styles) and profile settings (photo position, headline).

## What's Being Lost

### Links (all 3 creation paths)
The link insert only saves `link_type`, `label`, `url`, `sort_order`, `is_active`. These fields are **dropped**:
- `pill_color` (custom button color)
- `is_featured` (highlighted link)
- `display_style` ("pill" / "icon" / "both")
- `cover_image_url` (cover image added via LinkModal)
- `grid_size` ("half" / "full")
- `thumbnail_url` (small icon image)

### Blocks
- `alignment` field exists in the database column but is never written during signup

### Profile preview during signup
- `pfp_position` is hardcoded to `null` in the LinksStep preview, so it doesn't reflect the "center" default

### Stripe payment flow
- `headline` and `bio` are not included in the saved signup data, and `headline` is explicitly set to `null` after payment

## Changes

### 1. Fix link inserts (3 locations)

**File: `src/components/personal/signup/CheckoutStep.tsx`** -- OTP flow (line ~403) and pre-auth flow (line ~591)

Add missing fields to link inserts:
```typescript
const linksToInsert = formData.links.map((link, index) => ({
  profile_id: profileResult.id,
  link_type: link.type,
  label: link.label,
  url: link.url,
  sort_order: link.sortOrder ?? index,
  is_active: true,
  pill_color: link.pillColor || null,
  is_featured: link.isFeatured || false,
  display_style: link.displayStyle || "pill",
  cover_image_url: link.coverImageUrl || null,
  grid_size: link.gridSize || null,
  thumbnail_url: link.thumbnailUrl || null,
}));
```

**File: `src/pages/personal/PersonalSignupComplete.tsx`** -- Stripe completion flow (line ~236)

Same fix for the links inserted after Stripe payment verification.

### 2. Fix block inserts (3 locations)

**Files: `CheckoutStep.tsx` and `PersonalSignupComplete.tsx`**

Add `alignment` to block inserts:
```typescript
const blocksToInsert = formData.blocks.map((block, index) => ({
  profile_id: profileResult.id,
  block_type: block.type,
  content: block.content || {},
  sort_order: block.sortOrder ?? index,
  is_active: true,
  alignment: block.content?.alignment || "center",
}));
```

### 3. Fix preview pfp_position default

**File: `src/components/personal/signup/LinksStep.tsx`** (line 271)

Change `pfp_position: null` to `pfp_position: "center"` in the preview profile object.

### 4. Include headline/bio in Stripe saved data

**File: `src/components/personal/signup/CheckoutStep.tsx`** (line ~682)

Add `headline` and `bio` to the `signupData` object saved to sessionStorage before Stripe redirect:
```typescript
const signupData = {
  ...existing fields,
  headline: formData.cardHeadline || null,
  bio: null, // bio field if it exists
};
```

**File: `src/pages/personal/PersonalSignupComplete.tsx`**

Update the `SavedSignupData` interface to include `headline`, and use it instead of hardcoding `null`:
```typescript
headline: savedData.cardHeadline || null,
```
(This is already partially correct since `cardHeadline` maps to `card_front_headline`, but `headline` the profile field is being set to `null` explicitly.)

### 5. Preserve sort_order from unified ordering

All link/block inserts currently use the array index for `sort_order`, which loses the interleaved ordering the user set up. Change to use `link.sortOrder ?? index` and `block.sortOrder ?? index` to preserve drag-and-drop order.

## Files Changed

| File | Change |
|------|--------|
| `src/components/personal/signup/CheckoutStep.tsx` | Add all missing link fields to inserts (2 places: OTP + pre-auth), add alignment to block inserts, include headline in Stripe saved data, preserve sort_order |
| `src/pages/personal/PersonalSignupComplete.tsx` | Add all missing link fields to insert, add alignment to block inserts, use saved headline instead of null, preserve sort_order |
| `src/components/personal/signup/LinksStep.tsx` | Set `pfp_position: "center"` in preview profile |

## Technical Notes

- Link images (`cover_image_url`, `thumbnail_url`) are already uploaded to Supabase storage during the signup flow via LinkModal, so the URLs are valid public URLs ready to be stored
- The `personal-link-images` bucket is public and allows unauthenticated inserts, so these URLs persist across the payment redirect
- No database changes needed -- all columns already exist in the `personal_links` and `personal_blocks` tables
