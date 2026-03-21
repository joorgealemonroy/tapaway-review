

# Replace Manual Entry with Magic Link Scraper in Onboarding

## Current Flow (Vibe Path)
1. **ClaimStep** — username, email, password
2. **PersonalizeStep** — manual link entry (the screen in the screenshot) ← **REMOVE THIS**
3. **CheckoutStep** — payment/finish

## New Flow
1. **ClaimStep** — username, email, password
2. **MagicLinkStep** (new) — "Let's auto-build your profile" with single URL input + Generate → scanning animation → Design Fork → auto-populate links
3. **CheckoutStep** — payment/finish

## Changes

### 1. New component: `src/components/personal/signup/MagicLinkStep.tsx`

A clean, focused step component with:
- Headline: "Let's auto-build your profile."
- Subtext: "Paste your main social link and we'll do the rest."
- Single input field with Globe icon + "Generate" button
- "Works with:" badges (Linktree, Stan Store, Beacons, etc.)
- **Skip link** at bottom: "I'll add links later →" that calls `onNext()` with empty links (vibe defaults stay)
- **Loading state**: 3-phase animated text ("Scanning for links...", "Mapping your links...", "Building your TapAway...") with a progress bar, using Framer Motion
- **Design Fork** (after scrape succeeds): "Do you want images on your link buttons?" — two visual cards: "Clean Pills" vs "Visual Cards"
- **On selection**: Maps scraped data into `formData.links` via `addLink()`, strips images if "Clean Pills" chosen, then calls `onNext()`
- Uses the existing `scrape-link-bio` edge function (same as ImportProfile.tsx)

### 2. Modify `src/pages/personal/PersonalSignup.tsx`

- Import `MagicLinkStep` instead of (or alongside) `PersonalizeStep`
- **Step 2 rendering** (~line 473): When `fromVibeFlow` is true, render `<MagicLinkStep>` instead of `<PersonalizeStep>`
- Pass `addLink`, `removeLink`, `update`, `onNext`, `onBack`, and `formData` props
- Update `stepTitles[2]` to `"Auto-build your profile"` for the vibe flow
- The `MagicLinkStep` handles its own internal sub-states (input → loading → fork → done) and calls `onNext()` when complete

### 3. MagicLinkStep internal logic

- Reuses scraping logic from `ImportProfile.tsx` (call `scrape-link-bio` edge function)
- On successful scrape + design fork selection:
  - Clear existing vibe placeholder links via `update({ links: [], blocks: [] })`
  - Map scraped social + content links into `addLink()` calls with proper `type`, `url`, `label`, `displayStyle`, `gridSize`, `coverImageUrl` based on fork choice
  - If photo found, set `update({ profilePhotoUrl: data.photoUrl })`
  - If name/bio found, set `update({ fullName: data.name, cardHeadline: data.bio })`
- On "Skip" — keep vibe template defaults, proceed to checkout

## Files

| File | Change |
|------|--------|
| **New**: `src/components/personal/signup/MagicLinkStep.tsx` | Magic Link scraper step with loading animation + design fork |
| `src/pages/personal/PersonalSignup.tsx` | Render `MagicLinkStep` instead of `PersonalizeStep` for vibe flow |

