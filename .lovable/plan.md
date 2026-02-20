

# NFC Card Landing Page — Overview, Real Hub Examples, and Layout Templates

## Overview

When a user taps their unclaimed NFC card and lands on `/c/:code`, instead of jumping straight into the activation form, they first see an engaging overview that explains what TapAway is, showcases real hubs from active users, and offers pre-made layout templates they can copy. The activation flow remains accessible via a prominent CTA.

## New User Experience Flow

1. User taps card, lands on `/c/CODE`
2. Card is unclaimed -- instead of immediately showing the email form, show an **onboarding overview page** with:
   - Animated card visual (existing) + "Your card is ready to activate" heading
   - **"How It Works"** section: 3 simple steps (Tap, Share, Connect)
   - **"Real Hubs"** carousel: Live screenshots/links of active profiles (jorge, julian, jor, trepif, etc.)
   - **"Pick a Layout"** section: 3-4 pre-made layout templates users can preview and select before signing up
   - Prominent **"Activate Now"** CTA button that scrolls to / reveals the existing email activation form
3. When user clicks "Activate Now" or scrolls to activation, the existing email -> OTP -> password flow appears
4. If a layout template was selected, it's stored in sessionStorage and applied during signup

## Changes

### 1. New Component: `CardOnboarding.tsx`

Create `src/components/card/CardOnboarding.tsx` -- the overview section shown before activation.

**Sections:**
- **Hero**: Existing animated card + "Your TapAway card is ready" + "Activate Now" CTA
- **How It Works**: 3 icons -- Tap your card, Build your hub, Share with anyone
- **Real Hubs Showcase**: Horizontal scrollable row of real profile previews with avatars, names, and "View Live" links. Profiles are fetched from the database (active profiles with photos).
- **Layout Templates**: 3-4 hardcoded template options (e.g., "Social Star" -- all social links; "Business Pro" -- contact card + links; "Creative" -- image grid + bio; "Minimal" -- clean links only). Each shows a visual preview and a "Use This Layout" button that stores the choice in sessionStorage.

### 2. Update `CardResolver.tsx`

- Add a new state: `showOverview` (default: `true` for unclaimed cards)
- When card is unclaimed and user is not logged in, render `CardOnboarding` first
- "Activate Now" button sets `showOverview = false` and reveals the existing activation form
- Pass selected layout template code to the signup flow via sessionStorage (`tapaway_selected_layout`)

### 3. New File: `src/lib/layoutTemplates.ts`

Define the template data structure:

```typescript
interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  previewImage: string; // static asset or generated
  defaultLinks: Array<{ type: string; label: string; placeholder: string }>;
  defaultBlocks: Array<{ type: string; content: Record<string, unknown> }>;
  headerType: string;
  style: { bgColor: string; headerColor: string };
}
```

Templates:
- **Social Star**: Instagram, TikTok, YouTube, Twitter links in pill style
- **Business Pro**: Contact card block + website + LinkedIn + email link
- **Creative Portfolio**: Image collage block + bio block + links
- **Minimal**: Clean text links only, no blocks

### 4. Update `PersonalSignup.tsx` — Apply Selected Layout

- On mount, check `sessionStorage.getItem("tapaway_selected_layout")`
- If a template was selected, pre-fill the `LinksStep` with the template's default links and blocks
- User just needs to fill in their actual URLs and photos

### 5. New Component: `HubShowcase.tsx`

Create `src/components/card/HubShowcase.tsx` -- fetches and displays real active profiles:

- Queries `personal_profiles` for active profiles with photos (limit 6)
- Renders each as a card with avatar, name, headline, and a link to `tapaway.co/:username`
- Horizontal scroll on mobile, grid on desktop

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/card/CardOnboarding.tsx` | Overview page with How It Works, real hubs, layout templates |
| `src/components/card/HubShowcase.tsx` | Fetches and displays real active profile cards |
| `src/components/card/LayoutTemplates.tsx` | Visual layout template picker UI |
| `src/lib/layoutTemplates.ts` | Template definitions (links, blocks, styles) |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/CardResolver.tsx` | Add `showOverview` state, render `CardOnboarding` before activation form, pass layout selection |
| `src/pages/personal/PersonalSignup.tsx` | Read selected layout from sessionStorage, pre-fill links/blocks |
| `src/components/personal/signup/LinksStep.tsx` | Accept initial links/blocks from layout template |

## Technical Notes

- Real hub showcase fetches only public data (username, full_name, headline, profile_photo_url) from active profiles -- no auth needed, RLS already allows anon select on personal_profiles
- Layout templates are hardcoded definitions (not database-stored) to keep it simple and fast
- Selected template stored in sessionStorage survives the OTP/password flow and Stripe redirect
- The overview page uses the same teal gradient styling as the existing CardResolver for visual consistency
- All profile photos in the showcase use `getOptimizedImageUrl` for fast loading
- Template previews are static illustrations (not live renders) to keep the page lightweight

