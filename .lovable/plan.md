

# Make Marketing Footer Cards Draggable Content Items

## Problem
The three marketing elements (CTA pill, Examples card, Features card) are currently hardcoded — a static read-only block in the dashboard and hardcoded rendering in the profile. The user wants them as real, reorderable content items within the unified content system.

## Approach
Convert the three marketing elements into actual `personal_blocks` database records with new block types. This makes them automatically draggable, reorderable, and toggleable within the existing unified content editor — no special plumbing needed.

## Changes

### 1. Database Migration
Insert three `personal_blocks` rows for the socials profile (`893204e4-34e8-4058-a5ad-40b57de0af1a`) with block types:
- `marketing_cta` (the "Try It Free" pill)
- `marketing_examples` (the live business examples dropdown)
- `marketing_features` (the 2x3 features grid)

Each gets a `sort_order` placed after existing content.

### 2. `DashboardUnifiedContent.tsx`
- Add the three new block types to `renderBlockIcon()` (Megaphone, ExternalLink, LayoutGrid icons)
- Add them to `getBlockLabel()` with readable names
- No other changes needed — they'll automatically be draggable/reorderable/toggleable like any block

### 3. `ProfilePreviewRenderer.tsx`
- In the block rendering section, handle `marketing_cta`, `marketing_examples`, and `marketing_features` block types by rendering the actual marketing UI (same content currently in `MarketingFooterCards`)
- Remove the hardcoded `{profile.username === 'socials' && <MarketingFooterCards />}` conditional

### 4. `PersonalProfilePage.tsx`
- Same as above — render the marketing content inline when encountering these block types
- Remove the hardcoded `MarketingFooterCards` import and rendering

### 5. `PersonalDashboard.tsx`
- Remove the static "Marketing Footer (auto)" summary card (lines 809-833)
- Remove `Megaphone` import if no longer used

### Result
The three marketing elements become normal blocks: draggable, reorderable, and toggleable via the existing content editor. They render their specialized marketing UI on the public profile and preview, but behave like standard blocks in the dashboard.

