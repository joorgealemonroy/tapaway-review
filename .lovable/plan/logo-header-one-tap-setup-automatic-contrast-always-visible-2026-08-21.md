# Logo header: one-tap setup, automatic contrast, always-visible actions

## What's wrong today

Choosing **Logo** currently gives you a size control and a "Match background to logo" button you have to remember to press. If the logo has a white background and the page is white, the name, tagline and outline buttons wash out — and the Save contact / Share icons don't appear over the logo area at all, so on mobile the top of the hub looks empty and unusable.

## What changes

### 1. Picking "Logo" just works (one tap)

Selecting Logo header immediately, without any extra taps:

- Samples the logo's own edge color and sets the page background to it (white logo -> white page, dark crest -> dark page). Still overridable with the color picker.
- Recomputes text and button colors for that background so the name, tagline and every tile stay readable.
- Skips cropping entirely — the uploaded image is used whole.

"Match background to logo" stays as a manual re-run, but it is no longer required.

### 2. Automatic readability on any background

A single contrast rule applied wherever the hub is drawn (live hub, dashboard preview, rep preview):

- Light page -> dark text, dark-on-light pills with a soft border so white-on-white buttons still have an edge.
- Dark page -> light text and translucent light pills.
- The rule is derived from the actual page background (including sampled logo color and gradients), not from a stored guess, so it can never drift out of sync with the color the owner picked.
- If a custom text or button color the owner set would fail contrast against the new background, it is nudged to a readable variant rather than silently disappearing.

### 3. Save contact / Share always visible

For Logo header the two round buttons pin to the top-right of the page, floating over the logo band (same position as banner hubs) instead of being pushed under the logo where they currently vanish. They get:

- a tinted backdrop chosen from the page background (light chip on dark, dark chip on light) plus a hairline border, so they read against a plain white logo area,
- a 44px touch target and safe-area-aware top offset for phones,
- the existing "Save my contact!" tooltip unchanged.

### 4. Mobile-first editor

The Logo section of the Design tab is reworked for a phone:

- Size becomes three large, full-width-thirds tap targets with a live thumbnail of the logo at that size, not just text labels.
- Background row shows the current color as a big swatch with "Match to logo" and "White / Black" quick chips beside it.
- A one-line live contrast indicator ("Buttons and text look good on this background") that flips to a warning plus a one-tap fix if it fails.
- Everything stays inside the existing pending-changes / Save flow — no surprise writes.

## Technical notes

- `src/components/personal/DashboardDesignTab.tsx`: on `handleTypeChange("logo")`, run `sampleBottomEdgeColor(profilePhotoUrl)` and set pending background + derived text/button colors; rebuild the logo panel (thumbnail size buttons, swatch row, contrast hint); keep crop/fit controls hidden for this style.
- New helper `src/lib/hubContrast.ts`: `resolveHubContrast(bgColor, textColor, accentColor)` returning `{ isDark, textClass, mutedClass, pillBg, pillBorder, iconChipBg, iconColor }`, built on the existing `isColorDark` / `getBaseColorFromGradient` logic so all three renderers share one source of truth.
- `src/pages/personal/PersonalProfilePage.tsx` (~1342): move the top-right action cluster out of the `!hasBanner` content block into an absolutely positioned cluster rendered for `isLogoHeader` too, styled from `resolveHubContrast`; keep the existing banner and plain-header branches behaving exactly as now.
- `src/components/personal/ProfilePreviewRenderer.tsx` and `src/components/rep/LivePhonePreview.tsx`: consume the same helper and mirror the action cluster so preview matches live.
- No migration: `header_type = 'logo'`, `logo_scale`, `background_color`, `text_color`, `button_theme` already exist.

## Scope guard

Only hubs whose owner picks Logo header are affected. Banner, photo and solid-color hubs render exactly as they do today; the contrast helper is applied to them only in the places that already computed the same thing inline.

## Verification

- Mariscos Las Nuevas Islas on Logo header: white page, dark readable name/tiles, Save contact and Share visible top-right over the white logo area on a 390px phone.
- A dark crest logo yields a dark page with light text and light chips.
- Reborn Wraps and Xol Coffee (banner) render unchanged.
- Dashboard preview and rep phone preview match the live hub.
