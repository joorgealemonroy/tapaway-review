

# "Obsidian" Save & Polish

## Overview
Enhance the PersonalizeStep with smart input UX, image block support, `is_placeholder` tracking, and a bottom-sheet "Add Block" menu.

## 1. Database Migration

Add `is_placeholder` to both `personal_links` and `personal_blocks`:

```sql
ALTER TABLE public.personal_links ADD COLUMN is_placeholder boolean NOT NULL DEFAULT false;
ALTER TABLE public.personal_blocks ADD COLUMN is_placeholder boolean NOT NULL DEFAULT false;
```

## 2. Data Persistence — Mark Placeholders on Insert

**`src/components/personal/signup/CheckoutStep.tsx`** (~line 523-536, ~line 553-559)
- Add `is_placeholder: true` to each link/block inserted during signup when the value matches a default placeholder (`@yourname`, `you@email.com`, etc.)
- Use the existing `DEFAULT_PLACEHOLDERS` check from PersonalizeStep

## 3. Smart Input UX — `PersonalizeStep.tsx` Overhaul

Replace the current input rendering with:

- **Fixed `@` prefix** for social-type inputs: render a non-editable `@` span to the left of the input. Strip `@` from the stored value on change so it doesn't double up.
- **Auto-select on focus**: add `onFocus={(e) => e.target.select()}` to each input so typing instantly replaces placeholders.
- **Faded placeholder styling**: when `isRealValue()` is false, apply `opacity-50` to the input text.

## 4. Image Block Support

When the vibe has `defaultBlocks` with `type: "image"` (e.g., Vogue), render an "Add a Picture" card in the PersonalizeStep below the link inputs.

- Show a dashed-border upload area with a camera/image icon
- On click, open a file picker → pipe to the existing `ImageCropper` component (rect aspect, 16:9)
- Store the cropped image as a data URL in the block's `content.url` field in onboarding state
- On final save (CheckoutStep), upload to `personal-link-images` storage bucket and update the block's content

## 5. Bottom Drawer for "Add Another Block"

Replace the `+ Add another link` text button with `+ Add another block`:
- On tap, open a `Drawer` (from `@/components/ui/drawer`) with two options:
  - **Add a Link** — opens existing `LinkModal`
  - **Add a Picture Block** — adds an image block to `formData.blocks` and scrolls to it

## 6. Files to Modify

| File | Change |
|------|--------|
| **Migration** | Add `is_placeholder` to `personal_links` and `personal_blocks` |
| `src/components/personal/signup/PersonalizeStep.tsx` | Fixed `@` prefix, auto-select, opacity styling, image block rendering, bottom drawer |
| `src/components/personal/signup/CheckoutStep.tsx` | Set `is_placeholder` on link/block inserts |
| `src/hooks/usePersonalOnboarding.ts` | No changes needed — blocks already tracked in state |

No real-time Supabase sync during onboarding (profile doesn't exist yet). The `is_placeholder` flag enables the dashboard to show "Click to edit" indicators post-signup.

