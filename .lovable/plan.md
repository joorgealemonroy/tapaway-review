

# Add "Sell From Your Hub" Feature Showcase to Landing Page

Inspired by the uploaded image, I'll create a new section highlighting the marketplace/shop capability — showing a profile card with links, a revenue stat card, and a product card overlay, similar to the reference image's composition.

## New Component: `PersonalShopShowcase.tsx`

**Location:** `src/components/landing/personal/PersonalShopShowcase.tsx`

A visually rich section with:
- **Headline:** "Sell directly from your hub" with supporting copy
- **Visual composition** (inspired by the reference image):
  - A mock profile card (rounded, with avatar, name, headline, link pills, social icons)
  - A floating "Total Revenue" stat card (lime/primary accent, showing $1,536)
  - A floating "Product" card (showing a merch item with price + CTA)
- All three elements arranged with slight rotation/overlap using absolute positioning and framer-motion animations
- Dark background section (like the reference's deep maroon, but using the app's dark palette `#0B1220`)
- CTA button: "Start Selling" → links to `/personal/signup`

**Design details:**
- Revenue card: primary-colored with dollar icon, total revenue number
- Product card: white card with image placeholder, price, "Full collection" button
- Profile card: dark card with avatar, name, link buttons, social icons
- Mobile: stack vertically with cards centered; desktop: composed layout

## Integration into `Personal.tsx`

Insert between `PersonalFeatures` and `PersonalUseCases`:

```
<PersonalFeatures />
<PersonalShopShowcase />   ← NEW
<PersonalUseCases />
```

## No backend or schema changes needed

This is purely a frontend marketing section — no database, edge function, or migration changes.

