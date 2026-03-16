

# Syncing Vibe Selection to Database

## What Already Works
The signup flow already reads the selected vibe from sessionStorage, applies its colors (bgColor, headerColor, headerType) to the form data, and inserts default links/blocks. These are persisted when the profile is created in CheckoutStep.

## What's Missing

### 1. Database: Add `vibe_id` column to `personal_profiles`
Add a nullable `vibe_id` text column so we can reference which vibe was selected. No new table needed.

```sql
ALTER TABLE public.personal_profiles ADD COLUMN vibe_id text;
```

### 2. Frontend: Pass vibe_id through the signup flow

**`src/pages/personal/PersonalSignup.tsx`**
- Store the vibe ID in onboarding state alongside the existing color/link setup (around line 182)
- Add `vibeId` to the onboarding data model

**`src/hooks/usePersonalOnboarding.ts`**
- Add `vibeId: string | null` field to the onboarding data shape

**`src/pages/personal/PersonalSignup.tsx` (SignupData interface)**
- Add `vibeId?: string | null` to `SignupData`

### 3. Frontend: Save `vibe_id` + `button_theme` when creating profile

**`src/components/personal/signup/CheckoutStep.tsx`** — Two profile creation paths:
- `verifyOTPAndCreateAccount` (~line 479): Add `vibe_id: formData.vibeId` and `button_theme` to `profileData`
- `createProfileDirectly` (~line 705): Same addition

The `button_theme` will map from the vibe's mockup accent color (e.g., Obsidian gets gold buttons, Neon gets electric blue).

### 4. "Building your Hub..." loading transition

**`src/components/personal/signup/SuccessScreen.tsx`**
- Accept optional `vibeName` and `accentColor` props
- Show a 1.5s "Building your [Vibe Name] Hub..." spinner before the confetti celebration, using the vibe's accent color for the spinner
- Falls back to generic "Building your Hub..." if no vibe

**`src/pages/personal/PersonalSignup.tsx`**
- Pass `vibeName` and `accentColor` from `vibeMetadata` to `SuccessScreen`

### 5. Profile rendering: respect stored vibe colors

The profile page (`PersonalProfilePage.tsx`) already reads `background_color`, `header_color`, `header_type` from the database and applies them. No changes needed there since the colors are already being saved correctly.

## Files to Modify

| File | Change |
|------|--------|
| **Migration** | Add `vibe_id` text column to `personal_profiles` |
| `src/pages/personal/PersonalSignup.tsx` | Add `vibeId` to SignupData, pass it through onboarding state, pass vibe metadata to SuccessScreen |
| `src/hooks/usePersonalOnboarding.ts` | Add `vibeId` field |
| `src/components/personal/signup/CheckoutStep.tsx` | Include `vibe_id` and `button_theme` in both profile insert paths |
| `src/components/personal/signup/SuccessScreen.tsx` | Add "Building your Hub..." loading state with vibe accent color |

