

# Fix: Stale Profile Data + White Banner Readability

## Issue 1: Changes not showing up instantly on profile page

**Root cause**: In `useProfileData.ts`, there's a `fetchedRef` guard (line 142) that prevents re-fetching if the username hasn't changed. When you edit in the dashboard, `invalidateProfileCache()` clears the cache correctly, but when you navigate back to the profile page, `fetchedRef.current === username` is still true, so it returns early without fetching fresh data.

**Fix in `src/hooks/useProfileData.ts`**:
- Remove the `fetchedRef` guard entirely — the in-memory cache already handles deduplication
- Without `fetchedRef`, the flow becomes: check cache → miss (it was invalidated) → fetch fresh data → update cache
- This is safe because concurrent fetches are already prevented by React's state batching

## Issue 2: White banner image makes text unreadable

**Root cause**: In `PersonalProfilePage.tsx`, the banner gradient fade uses `${extractedBannerColor}40` (25% opacity) and text is hardcoded to `text-white`. When the profile image is white/light, both the gradient and text are invisible.

**Fix in `src/pages/personal/PersonalProfilePage.tsx`**:
1. Add a luminance check on the extracted banner color (parse `rgb(r,g,b)` → compute luminance)
2. When the banner color is light (luminance > 0.7):
   - Increase gradient opacity from `40` to `CC` (80%) and use a dark overlay instead of the extracted color
   - Switch banner text from `text-white` to `text-gray-900`
   - Switch action buttons from `bg-black/30` to `bg-white/80` with dark icons
3. Pass `isLightBanner` flag to the links container background section

### Files to modify (2):
- `src/hooks/useProfileData.ts` — remove `fetchedRef` guard
- `src/pages/personal/PersonalProfilePage.tsx` — add light-banner detection and adaptive styling

