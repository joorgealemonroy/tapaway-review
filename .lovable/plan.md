

# Fix Marketing Examples Dropdown State and Slugs

## Problem
The `marketing_examples` block in both `ProfilePreviewRenderer.tsx` and `PersonalProfilePage.tsx` has no `onChange` handler and a hardcoded href, so every option opens `/sugarbloom`. The Bakery slug is also wrong and a Creator option is missing.

## Changes

### 1. Create shared sub-component: `src/components/personal/MarketingExamplesCard.tsx`
A small stateful component used by both renderers:
- Defines options array: Bakery → `/sugarbloomcakery`, Barbershop → `/spacestudios`, Car Wraps → `/rebornwraps`, Restaurant → `/islasmarias`, Creator → `/denzel`
- Uses `useState(0)` for selected index
- Wires `<select onChange>` and dynamic `href={...exOpts[selected].slug}`
- Accepts a `compact` prop (boolean) to toggle between small (preview) and full-size (profile page) styling

### 2. `ProfilePreviewRenderer.tsx` (lines 711-728)
Replace the inline `marketing_examples` case with:
```tsx
case "marketing_examples":
  return <MarketingExamplesCard key={block.id} compact />;
```

### 3. `PersonalProfilePage.tsx` (lines 735-755)
Replace the inline `marketing_examples` case with:
```tsx
case "marketing_examples":
  return <MarketingExamplesCard key={block.id} />;
```

### 4. `MarketingFooterCards.tsx` (lines 14-18)
Update options array: fix `/sugarbloom` → `/sugarbloomcakery`, add `{ label: "Creator", slug: "/denzel" }`.

