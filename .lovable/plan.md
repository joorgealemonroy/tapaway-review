

# Remove Cards Tab from Personal Dashboard

## Changes

### `src/pages/personal/PersonalDashboard.tsx`
1. Remove the `DashboardCardsTab` import (line 38)
2. Remove the `CreditCard` icon from the lucide-react import if only used for the cards tab trigger
3. Remove the Cards `TabsTrigger` (lines 679-682)
4. Remove the Cards `TabsContent` block (lines 798-801)

### `src/components/personal/DashboardCardsTab.tsx`
- Delete this file entirely (it's a "Coming Soon" placeholder with no other consumers)

