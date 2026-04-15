

# Implementation Plan: Contact Card Display Style (Icon vs Button)

## Overview
Add `contact_display_style` toggle to let creators choose between a top-right icon (default) or a full-width inline button for the "Save Contact" action. The user has already run the SQL migration.

## Files to Modify

### 1. `src/hooks/useProfileCache.ts`
Add `contact_display_style?: string | null` to the `CachedProfile` interface (after `contact_website`).

### 2. `src/components/personal/DashboardContactCard.tsx`
- Add `contact_display_style` to `ContactSettings` interface
- Add `onDisplayStyleChange?: (style: string) => void` to Props for instant preview feedback
- Add `displayStyle` state initialized from `initialSettings.contact_display_style || 'icon'`
- Add radio group (using existing RadioGroup component) below the enabled toggle: "Icon (top right)" / "Button (in content)"
- On radio change: update local state AND call `onDisplayStyleChange` immediately for real-time preview
- Include `contact_display_style: displayStyle` in `handleSave`

### 3. `src/pages/personal/PersonalDashboard.tsx`
- Add `contact_display_style` to `PersonalProfile` interface
- Pass it in `DashboardContactCard` initialSettings
- Add `onDisplayStyleChange` callback that updates profile state instantly: `setProfile(prev => prev ? { ...prev, contact_display_style: style } : null)`
- This feeds `ProfilePreviewPanel` immediately via the existing `profile` prop

### 4. `src/components/personal/ProfilePreviewPanel.tsx`
- Add `contact_enabled`, `contact_display_style`, `contact_name`, `button_theme`, `text_color` to `ProfileData` interface (pass-through to renderer)

### 5. `src/components/personal/ProfilePreviewRenderer.tsx`
- Add `contact_enabled`, `contact_display_style`, `contact_name`, `button_theme`, `text_color` to `ProfileData` interface
- After bio section (line ~842), before content section: if `profile.contact_enabled && profile.contact_display_style === 'button'`, render a full-width pill button
- Button styling: background from `profile.button_theme` (fallback: white on dark, black on light), text auto-contrast via `isColorDark()`, `rounded-full`, `shadow-lg`, `py-3`, `font-semibold`, `UserPlus` icon

### 6. `src/pages/personal/PersonalProfilePage.tsx`
- **Tooltip suppression** (line ~981): Add guard `if (data?.profile?.contact_display_style === 'button') return;`
- **Icon hiding** (lines ~1246, ~1298): Wrap contact icon with `&& profile.contact_display_style !== 'button'`
- **Inline button** (after bio ~line 1389, before links section): Render full-width pill button using `profileAccentColor` for bg, `isColorDark` for text contrast, onClick calls `handleSaveContact`

## Real-time Preview UX
The `onDisplayStyleChange` callback fires immediately on radio toggle, updating `profile` state in PersonalDashboard, which propagates to ProfilePreviewPanel → ProfilePreviewRenderer. The button appears/disappears on the preview phone instantly, before save.

