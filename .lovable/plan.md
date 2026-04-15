

# Restore White Pill for Google Review Button

## Problem
The Google Review button currently uses the same glassmorphism style as all other links. The user wants it to stand out with a **white solid background**, dark text, and the colorful Google "G" icon — as shown in their screenshot.

## Changes

Add `google_review` detection in all three rendering files. When a link is a Google Review, use `bg-white text-gray-900` instead of the glass style.

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | In ProfileLink (~line 250), detect `link.link_type === 'google_review'`. If true: white bg, dark text, colorful Google icon circle. |
| `src/components/personal/ProfilePreviewRenderer.tsx` | In renderLink (~line 486), same detection — white bg, dark text for Google Review. |
| `src/components/personal/ProHubTemplate.tsx` | In standard links loop (~line 168), same detection — white bg, dark text for Google Review. |

### Google Review style
```
bg-white hover:bg-gray-100 text-gray-900 border border-white/20 shadow-sm
```
Icon stays as the colorful Google "G" on its platform background. All other links remain glassmorphism unchanged.

