

# Advanced Analytics for Pro Users

## What exists today
The Stats tab shows 3 simple counters (7d / 30d / all-time profile visits). The `personal_analytics` table stores `event_type` and `visitor_info` (JSON with referrer + userAgent). Currently only `profile_visit` and `contact_save` events are tracked — **no link click tracking exists**.

## Plan

### 1. Add link click tracking on the public profile
**File**: `src/pages/personal/PersonalProfilePage.tsx`

Wrap every link `<a>` click with an `onClick` handler that inserts into `personal_analytics` with `event_type: "link_click"` and `visitor_info: { link_id, link_label, link_url, referrer, userAgent }`. Fire-and-forget, non-blocking. Apply to pill links, grid links, social icon links, and block buttons.

### 2. Create `AdvancedAnalyticsTab` component
**File**: `src/components/personal/AdvancedAnalyticsTab.tsx` (new)

Props: `profileId`, `planType`, `onUpgrade`

**For free users**: Show the basic 3-counter grid (profile visits) + a blurred/locked preview of the advanced section with a gentle "Unlock with Pro" prompt using `ProUpgradeDialog`.

**For Pro users**, fetch all `personal_analytics` rows for the profile and display:

- **Visitors over time chart** — Line chart (Recharts) showing daily profile visits for the last 30 days
- **Top links** — Ranked table of links by click count (label, clicks, % of total)
- **Engagement breakdown** — Pie or bar chart: profile_visit vs link_click vs contact_save
- **Referrer sources** — Table showing top referrer domains extracted from `visitor_info.referrer`
- **Device breakdown** — Simple mobile vs desktop split parsed from `visitor_info.userAgent`

### 3. Replace inline analytics in PersonalDashboard
**File**: `src/pages/personal/PersonalDashboard.tsx`

Replace the current inline Stats `<TabsContent>` (lines 774-793) with `<AdvancedAnalyticsTab profileId={profile.id} planType={profile.plan_type} onUpgrade={() => handleUpgrade("yearly")} />`. Remove the `analytics` state and `loadAnalytics` callback since the new component manages its own data.

### Files to create (1):
- `src/components/personal/AdvancedAnalyticsTab.tsx`

### Files to modify (2):
- `src/pages/personal/PersonalProfilePage.tsx` — add link click tracking
- `src/pages/personal/PersonalDashboard.tsx` — swap in new analytics component, remove old analytics state

