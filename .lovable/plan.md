

# Admin Portal Cleanup & Restructure

## Overview

Restructure `/admin` into a clean, tabbed layout with two client sections, removing deprecated features.

## Changes

### 1. Remove from `Admin.tsx`
- **SignupDropoffCard** component and import
- **Legacy Client Account** section (form, state variables, handler)
- The `create-legacy-client-account` edge function can remain (no harm), but all references removed from the UI

### 2. Restructure `Admin.tsx` with Tabs

Replace the current single "Restaurants" table with a tabbed interface:

```text
┌─────────────────────────────────────────────┐
│  TapAway Admin Dashboard                    │
│  [Sales Rep Portal links]  [Paywall Control]│
├─────────────────────────────────────────────┤
│  [ Business Lite ]  [ Restaurants ]         │
│─────────────────────────────────────────────│
│  (selected tab's table + filters)           │
└─────────────────────────────────────────────┘
```

**Tab A — "Business Lite"**: Embeds the existing `AdminPersonalAccounts` content (personal_profiles table) directly inline instead of navigating to a separate page. Shows username, name, email, plan, status, created date, and actions (edit, view profile, delete).

**Tab B — "Restaurants"**: The existing restaurants table (already in Admin.tsx), with its filters and edit/delete/hub actions preserved as-is.

### 3. Inline Personal Accounts

Move the `AdminPersonalAccounts` list/table logic into the Admin page's "Business Lite" tab. The full edit modal and create modal from `AdminPersonalAccounts` will still be accessible. The separate `/admin/personal-accounts` route can remain as a redirect or be kept for deep-linking.

### 4. Clean up nav links

Remove the "Personal Accounts" button from the Sales Rep Portal section since it's now inline. Keep "Founding Creators" as a separate page link since it's a different concern.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Remove SignupDropoffCard, remove legacy client section, add Tabs with "Business Lite" and "Restaurants" tabs, inline personal accounts list |
| `src/components/admin/SignupDropoffCard.tsx` | No change (can be deleted later) |

