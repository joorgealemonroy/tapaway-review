

# Pro-Branding: Logo Upload, Live 3D Preview & Data Persistence for Step 3

## Summary
Transform Step 3 ("info") into a premium branding experience with a logo upload drop zone, live logo rendering on the 3D card, proper data persistence before OAuth, and visual polish.

## Changes to `src/pages/Onboarding.tsx`

### 1. New state & logo upload logic
- Add `logoUrl` state (string | null)
- Add `logoUploading` state (boolean)
- Upload handler: upload to `restaurant-logos` bucket, get public URL, set `logoUrl`
- Save `logoUrl` to `onboardingData` alongside other fields before OAuth

### 2. Logo drop zone UI
- Add a dashed-border drop zone above the 3D card preview (always visible, not gated on businessName)
- Cloud upload icon + "Upload your logo" text + file input
- When logo uploaded: show small preview thumbnail with remove button
- Below the drop zone: italic text — *"Pro Tip: High-resolution PNGs work best. Our design team will manually optimize your logo for print quality."*

### 3. Live 3D card with logo overlay
- Remove the floating `<span>` business name overlay below the card
- Instead, render business name **inside** the card container as a positioned text element at the bottom edge
- Render the uploaded logo centered on the card face (overlaid on the grey circle area)
- Apply `perspective(1000px) rotateX(10deg) rotateY(-5deg)` to the card wrapper (no spinning animation in onboarding — static tilt for elegance)
- Show card always (not gated on `businessName.trim()`) — it acts as the hero visual

### 4. Data persistence before OAuth
- In `handleOAuth`, save ALL step 3 data to localStorage:
  - `businessName`, `shippingAddress`, `logoUrl`, `planType` (selectedPlan), `hasProtection`
- On post-auth `completeSetup`, read `logoUrl` from savedData and write it to `restaurants.logo_url`
- Pass `plan_type`, `has_protection`, `logo_url` into fulfillment_orders metadata

### 5. "Due Today" receipt styling
- Change background from `bg-[#111827]` to `bg-slate-900/50`
- Keep `border border-white/10` (already present)
- Add subtle inner padding increase

### 6. Spacing improvements
- Change the Step 3 container from `space-y-6` to `space-y-8` for breathing room
- Add extra margin between business name input, logo zone, 3D card, Google search, and pricing

## Changes to `src/lib/onboardingData.ts`
- Add `logoUrl?: string` and `planType?: string` and `hasProtection?: boolean` to `OnboardingData` interface

## Changes to `src/components/TapAwayCard3D.tsx`
- Add optional props: `logoUrl?: string`, `businessName?: string`, `staticTilt?: boolean`
- When `staticTilt` is true, skip the spin animation and use a static rotateY(0) 
- Render `logoUrl` as an `<img>` centered on the card front face (absolute positioned, circular, ~60px)
- Render `businessName` as text at the bottom of the card front face

## Files modified
1. `src/pages/Onboarding.tsx` — Logo upload, persistence, UI polish
2. `src/components/TapAwayCard3D.tsx` — Accept logo/name props, static mode
3. `src/lib/onboardingData.ts` — Extended interface

