

# Plan: Avatar Upload + Full-Page Vibe Gradients

## 1. Avatar Upload (PersonalizeStep)

**`src/components/personal/signup/PersonalizeStep.tsx`**
- Add `updateFormData` prop (type: `(updates: Partial<SignupData>) => void`)
- Render a circular 96px avatar placeholder at the top (camera icon + "Add Photo")
- On file select → open `ImageCropper` with `cropShape="round"` and 1:1 aspect
- On crop complete → upload to `personal-link-images` bucket via existing `uploadToStorage` pattern → call `updateFormData({ profilePhotoUrl: publicUrl })`
- If photo exists, show it; if skipped, leave null (graceful fallback to initials)

**`src/pages/personal/PersonalSignup.tsx`**
- Pass `updateFormData` as prop to `PersonalizeStep`

## 2. Vibe Gradient Backgrounds

### 2a. Add `bgStyle` to vibe templates

**`src/lib/vibeTemplates.ts`**
- Add a `bgStyle` property to `VibeTemplate.style`:

```typescript
style: {
  bgColor: string;
  headerColor: string;
  bgStyle: string; // full CSS background value
};
```

Gradient values per vibe:
| Vibe | bgStyle |
|------|---------|
| Obsidian | `linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)` |
| Bloom | `linear-gradient(180deg, #FDE2E4 0%, #FFF9F8 30%)` |
| Organic | `linear-gradient(180deg, #4a8c5c 0%, #f5f0e8 30%)` |
| Vogue | `linear-gradient(180deg, #3d342c 0%, #f5f0eb 30%)` |
| Neon | `linear-gradient(180deg, #0a0a1a 0%, #050505 100%)` |
| Elevate | `linear-gradient(180deg, #1e3a5f 0%, #ffffff 30%)` |
| Pure | `linear-gradient(180deg, #333333 0%, #ffffff 30%)` |

### 2b. Store gradient in database

**Database migration**: Add `bg_style` text column to `personal_profiles`:
```sql
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS bg_style text;
```

**`src/hooks/usePersonalOnboarding.ts`**
- Add `bgStyle?: string | null` to `PersonalOnboardingData`

### 2c. Pass through signup flow

**`src/pages/personal/PersonalSignup.tsx`**
- When applying a vibe (where `backgroundColor` is set from template), also set `bgStyle` from `template.style.bgStyle`

**`src/components/personal/signup/CheckoutStep.tsx`**
- In all 3 profile insert paths, add: `bg_style: formData.bgStyle || null`

### 2d. Apply on live profile

**`src/pages/personal/PersonalProfilePage.tsx`** (~line 1054-1060)
- Read `profile.bg_style` alongside `profile.background_color`
- If `bg_style` exists, use it as the primary background (`{ background: profile.bg_style }`)
- Fall back to existing `bgColor` logic if `bg_style` is null

```typescript
const bgStyle = profile.bg_style
  ? { background: profile.bg_style }
  : isGradientBg 
    ? { background: bgColor } 
    : { backgroundColor: bgColor };
```

Also update `outerBgColor` to extract the end color from `bg_style` for the outer wrapper.

## Files to Modify

| File | Change |
|------|--------|
| DB migration | Add `bg_style text` column to `personal_profiles` |
| `src/lib/vibeTemplates.ts` | Add `bgStyle` gradient string to each vibe's `style` |
| `src/hooks/usePersonalOnboarding.ts` | Add `bgStyle` to interface + initial data |
| `src/pages/personal/PersonalSignup.tsx` | Pass `updateFormData` to PersonalizeStep; set `bgStyle` when applying vibe |
| `src/components/personal/signup/PersonalizeStep.tsx` | Add avatar upload UI + `updateFormData` prop |
| `src/components/personal/signup/CheckoutStep.tsx` | Include `bg_style` in all 3 profile insert paths |
| `src/pages/personal/PersonalProfilePage.tsx` | Prefer `profile.bg_style` for background rendering |

