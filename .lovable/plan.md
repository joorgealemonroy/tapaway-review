

# Reorganize Mobile "More" Menu & Fix Shop Description

## Current Issues
1. **Shop description is wrong** — says "Get a physical NFC card" (that's for Cards, not Shop)
2. **Order isn't intuitive** — Leads → Cards → Shop → Plan has no logical flow

## Proposed Changes

**File:** `src/components/personal/MobileBottomNav.tsx` (lines 20-25)

Reorder and update descriptions for a natural user flow:

```
Current:                              New:
1. Leads - "View email captures"      1. Shop  - "Sell digital products"
2. Cards - "Coming soon"              2. Leads - "View email captures"  
3. Shop  - "Get a physical NFC card"  3. Plan  - "Subscription & billing"
4. Plan  - "Subscription & billing"   4. Cards - "Coming soon"
```

**Rationale:** Monetization first (Shop), then engagement (Leads), then account management (Plan), and finally the placeholder (Cards) at the bottom since it's not functional yet.

**Updated code:**
```typescript
const BASE_MORE_TABS = [
  { value: "shop", label: "Shop", icon: ShoppingBag, description: "Sell digital products" },
  { value: "leads", label: "Leads", icon: Mail, description: "View email captures" },
  { value: "plan", label: "Plan", icon: Sparkles, description: "Subscription & billing" },
  { value: "cards", label: "Cards", icon: CreditCard, description: "Coming soon" },
];
```

Single-file, 4-line change. No other files affected.

