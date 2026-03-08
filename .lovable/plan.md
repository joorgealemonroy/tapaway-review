

# Add Button/Pill Theme System for Personal Profiles

Inspired by the Linktree-style templates in the reference images, this adds a "Button Style" picker to the Design tab so users can change how their link pills look across their profile.

## Theme Options

```text
┌──────────────┬──────────────────────────────────────────────┐
│ Theme ID     │ Visual Description                           │
├──────────────┼──────────────────────────────────────────────┤
│ glass        │ Current default: semi-transparent, border,   │
│ (default)    │ backdrop-blur, icon box + label               │
├──────────────┼──────────────────────────────────────────────┤
│ filled       │ Solid header-color bg, white text, rounded,  │
│              │ no icon box (like Lane/Healeys)               │
├──────────────┼──────────────────────────────────────────────┤
│ outline      │ Transparent bg, visible border, clean text   │
│              │ (like Constance)                              │
├──────────────┼──────────────────────────────────────────────┤
│ soft         │ White/light pill, subtle shadow, no border   │
│              │ (like Balcombe/Artemis)                       │
├──────────────┼──────────────────────────────────────────────┤
│ shadow       │ Rounded-full pill, bold shadow, centered     │
│              │ text only (like Knox)                         │
└──────────────┴──────────────────────────────────────────────┘
```

## Changes Required

### 1. Database Migration
Add a `button_theme` column to `personal_profiles`:
```sql
ALTER TABLE personal_profiles ADD COLUMN button_theme text DEFAULT 'glass';
```

### 2. `ProfilePreviewRenderer.tsx`
- Accept `button_theme` from profile data
- In the `renderLink()` function (non-featured, non-cover-image pills at ~line 434), apply different className/style combos based on the theme value
- Each theme changes: border radius, background, border, shadow, text color, icon visibility

### 3. `DashboardDesignTab.tsx`
- Accept + emit `button_theme` in props and `onUpdate`
- Add a "Button Style" section with visual mini-previews of each theme (small rectangles showing the style)
- Track as pending state like other design options
- Save to DB alongside other design fields

### 4. Data Flow Updates
- **`PersonalDashboard.tsx`**: Fetch `button_theme`, pass to design tab and preview panel
- **`useProfileData.ts`**: Add `button_theme` to the select query
- **`PersonalProfilePage.tsx` / live profile**: Pass `button_theme` through to renderer

### 5. Onboarding (optional, deferred)
The existing layout templates in `layoutTemplates.ts` could include a default `buttonTheme` per template, but this can be added later.

## Technical Notes
- No new tables needed -- single column addition to existing table
- The `button_theme` value flows: DB -> profile fetch -> renderer props -> className logic
- Featured links and cover-image links keep their existing styles (themes only affect standard pill links)
- All 5 themes are free tier (no plan gating)

