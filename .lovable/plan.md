

# Plan: Live Profile Layout & CSS Sync

## Issues Identified

1. **Block ordering** — `sort_order` values are set correctly via `sortOrder ?? index`, but blocks in path 3 use bare `index` without considering link count offset, causing overlap with link sort_orders.
2. **Half-width grid** — Grid grouping logic requires `cover_image_url && grid_size === 'half'`. Links without cover images but with `grid_size: 'half'` (like Bloom's Instagram/TikTok) won't grid.
3. **Button/text colors** — `pill_color` defaults to `#000000` (black) across all paths. No `text_color` column exists in DB. The profile `button_theme` stores the accent hex but `ProfileLink` uses `pill_color` for button backgrounds.
4. **Missing header icons** — `display_style` defaults to `"both"` in paths 1 and 3, but path 2 defaults to `"pill"`, breaking icon display for existing-account flow.
5. **Background gradient** — `bg_style` is saved correctly but `useProfileData` doesn't include `bg_style` in its SELECT query, so it's never fetched.

## Changes

### 1. Database Migration — Add `text_color` column

```sql
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS text_color text;
```

### 2. `src/hooks/useProfileData.ts`

- Add `bg_style, vibe_id, button_theme, text_color` to the profile SELECT query (line 69).

### 3. `src/hooks/useProfileCache.ts`

- Add `bg_style`, `vibe_id`, `button_theme`, `text_color` fields to the `CachedProfile` interface.

### 4. `src/lib/vibeTemplates.ts`

- Already has `bgStyle` in each template's `style` object (added in prior plan). No changes needed.

### 5. `src/components/personal/signup/CheckoutStep.tsx`

**All 3 profile insert paths:**
- Add `text_color` to profileData, derived from vibe template's `mockupTheme.text`.

**All 3 link insert paths:**
- Set `pill_color` from vibe accent color instead of hardcoded `#000000`. Use `getVibeTemplate(formData.vibeId)?.mockupTheme.accent || "#000000"`.

**Path 2 (existing account, ~line 772):**
- Change `display_style` default from `"pill"` to `"both"` to match paths 1 and 3.

**All 3 block insert paths:**
- Ensure `sort_order` accounts for total link count: `sort_order: (block.sortOrder ?? index) + formData.links.length` — so blocks always come after links in the unified sort.

### 6. `src/pages/personal/PersonalProfilePage.tsx`

**Grid grouping logic (~line 1022):**
- Change condition from `item.data.cover_image_url && item.data.grid_size === 'half'` to just `item.data.grid_size === 'half'` — grid layout should work with or without cover images.

**Text/button color application (~line 1073):**
- Read `profile.text_color` and `profile.button_theme` from fetched data.
- If `text_color` exists, use it for `headingClass` and `textClass` via inline `style={{ color: profile.text_color }}` instead of generic dark/light classes.
- Pass `accentColor` (from `button_theme`) to `ProfileLink` so regular link buttons use the vibe accent as background.

**ProfileLink component (~line 244):**
- Accept optional `accentColor` prop.
- For regular (non-grid, non-featured, no cover image) links: if `accentColor` is provided and no custom `pill_color` override, use `accentColor` as the background color. This ensures buttons match the vibe.

**Background (~line 1056):**
- `profileBgStyle` is already read via `(profile as any).bg_style` — once the SELECT query includes it, this will work automatically.

### 7. `src/hooks/usePersonalOnboarding.ts`

- Add `textColor` to the onboarding data interface and initial state.

### 8. `src/pages/personal/PersonalSignup.tsx`

- When applying a vibe template, also set `textColor` from `template.mockupTheme.text`.

## Files to Modify

| File | Change |
|------|--------|
| DB migration | Add `text_color text` column |
| `src/hooks/useProfileData.ts` | Add `bg_style, vibe_id, button_theme, text_color` to SELECT |
| `src/hooks/useProfileCache.ts` | Add fields to `CachedProfile` interface |
| `src/hooks/usePersonalOnboarding.ts` | Add `textColor` to interface |
| `src/pages/personal/PersonalSignup.tsx` | Map `textColor` from vibe template |
| `src/components/personal/signup/CheckoutStep.tsx` | Add `text_color` to profile inserts, fix `pill_color` default, fix path 2 `display_style`, fix block `sort_order` offset |
| `src/pages/personal/PersonalProfilePage.tsx` | Fix grid grouping condition, apply `text_color` and `button_theme` to rendering, pass `accentColor` to ProfileLink |

