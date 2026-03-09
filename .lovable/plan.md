

# Mobile-First Business Dashboard Redesign

## Current State

The business dashboard uses a horizontal scrolling `TabsList` with up to 10 tabs (Overview, AI Coach, Competitors, Replies, Goals, Engagement, Menu, Settings, Support, Billing). On mobile this is a tiny scrollable strip that's hard to navigate and wastes space.

## Changes

### 1. Remove AI Coach, Competitors, and Goals tabs from `src/pages/Dashboard.tsx`

- Remove imports: `AICoachTab`, `CompetitorTab`, `GoalsTab`
- Remove `TabsTrigger` entries for `ai-coach`, `competitors`, `goals`
- Remove corresponding `TabsContent` blocks

This leaves 7 tabs: Overview, Replies, Engagement, Menu, Settings, Support, Billing.

### 2. Replace horizontal tab strip with mobile bottom navigation

Create a new component `src/components/dashboard/MobileBottomNav.tsx`:

- Fixed bottom bar (visible only on mobile via `md:hidden`)
- Shows 4 primary icons: Overview (Activity), Replies (MessageSquare), Menu (UtensilsCrossed), More (MoreHorizontal)
- "More" opens a sheet with: Engagement, Settings, Support, Billing
- Active tab highlighted with filled icon + teal accent
- Safe area padding for notched phones

### 3. Update `src/pages/Dashboard.tsx` layout for mobile

- Hide the `TabsList` strip on mobile (`hidden md:grid`)
- Render `<MobileBottomNav>` at the bottom on mobile
- Add `pb-20` padding to content area on mobile so content isn't hidden behind the nav
- Keep desktop tab strip unchanged (just fewer tabs)
- Simplify the top nav bar on mobile: show restaurant name + sign out icon only

### 4. Tighten mobile spacing in `AnalyticsOverview.tsx`

- Make the welcome card more compact on mobile (`p-4` instead of `p-6 sm:p-8`)
- Stack stat cards as 2-column grid on mobile (`grid-cols-2 sm:grid-cols-3`)
- Reduce chart height on mobile (200px vs 300px)
- Smaller heading text on mobile

## Files changed

| File | Change |
|------|--------|
| `src/components/dashboard/MobileBottomNav.tsx` | New — bottom tab bar + "More" sheet |
| `src/pages/Dashboard.tsx` | Remove 3 tabs, add mobile nav, add bottom padding, hide tab strip on mobile |
| `src/components/dashboard/AnalyticsOverview.tsx` | Tighten mobile spacing |

