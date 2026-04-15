

# Revert Google Review Button to Glassmorphism Style

## Problem

The Google Review "Leave us a Review" button currently gets a special white background treatment (`bg-white`, dark text), making it look different from all other buttons. The user wants it to match the uniform dark glassmorphism style shown in their screenshot.

## Changes

Remove the `isGoogleReview` / `defaultWhitePill` special-casing across all three rendering files so Google Review buttons use the same `bg-white/10 backdrop-blur-md border border-white/10` glass style as every other link.

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Remove `defaultWhitePill` variable and its conditional branches (lines 125-126, 260-263, 271, 273, 276, 279). Always use glass style. |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Remove `isGoogleReview` check (line 486) and its conditional branches (lines 496-499, 508, 511, 514-516, 517-519). Always use glass style. |
| `src/components/personal/ProHubTemplate.tsx` | Remove `isGoogleReview` check (line 169) and its conditional branches (lines 177-179, 184, 188-190). Always use glass style. |

The Google icon will keep its platform brand color (blue circle) for recognition — only the button container changes to match.

