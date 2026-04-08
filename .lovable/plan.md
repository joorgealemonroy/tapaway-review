

# Examples / Demo Showcase Page

## What we're building

A new `/examples` page that acts as a sales tool — both online and in-person. It shows two interactive phone mockups side by side (stacked on mobile): one for a **restaurant** and one for a **small business** (e.g. auto detailer, barber, salon). Each mockup demonstrates real TapAway features — review links, directions, menu, social links, etc. — so prospects can see exactly what they'd get.

At the bottom, a sticky "Call Us" bar with a phone number for old-fashioned prospects who want TapAway to set everything up for them.

## Page layout

```text
┌──────────────────────────────────────────────┐
│  Nav (LandingNav reused)                     │
├──────────────────────────────────────────────┤
│  Hero: "See TapAway in Action"               │
│  Subtitle: works for restaurants & small biz │
├──────────────────────────────────────────────┤
│  Toggle: [Restaurant]  [Small Business]      │
│  (desktop: side-by-side, mobile: tabs)       │
├─────────────────────┬────────────────────────┤
│  Phone Mockup #1    │  Feature callouts      │
│  "Maria's Taqueria" │  - Google Reviews      │
│  (interactive)      │  - Yelp Reviews        │
│                     │  - View Menu (modal)   │
│                     │  - Directions           │
│                     │  - Instagram            │
├─────────────────────┴────────────────────────┤
│  "Ready to get started?" CTA section         │
│  [Start Free Trial]  or  [Call Us]           │
├──────────────────────────────────────────────┤
│  Sticky bottom bar (mobile):                 │
│  📞 "Prefer someone to set it up? Call us"   │
│  (858) 555-1234                              │
└──────────────────────────────────────────────┘
```

## Two example profiles

### Restaurant example — "Maria's Taqueria"
- Logo placeholder, restaurant name, tagline "Authentic Mexican Food"
- Google Reviews button (primary)
- Yelp Reviews button (secondary)
- View Menu button → opens modal with sample menu (reuse existing menu data from Demo.tsx)
- Directions button
- Instagram button
- Feature callouts next to the mockup explaining each button's purpose

### Small Business example — "Reborn Wraps"
- Logo placeholder, business name, tagline "Vehicle Wraps & Detailing"
- Google Review link (primary)
- Website link
- Call Now button
- Instagram button
- Directions button
- No menu — instead a "Book Appointment" button placeholder
- Different feature callouts (review collection, contact info, booking)

## Features section (below mockups)
Stacked info cards that expand/collapse (accordion style) explaining:
1. **Collect More Reviews** — NFC tap or QR scan sends customers straight to your review page
2. **One Link, Everything** — Menu, socials, directions, all in one place
3. **Works for Any Business** — Restaurants, salons, auto shops, gyms, etc.
4. **No App Needed** — Customers just tap and go, nothing to download
5. **We Set It Up For You** — Call us and we handle everything

## "Call Us" section
- Prominent phone number with click-to-call (`tel:` link)
- Short message: "Not tech-savvy? No problem. Call us and we'll set everything up for you."
- Available on both mobile sticky bar and inline CTA

## Technical details

### Files created
1. **`src/pages/Examples.tsx`** — Main page component with:
   - Reuses `LandingNav` for consistent navigation
   - Tab toggle between Restaurant and Small Business examples
   - Phone mockup frame (similar style to `ProfilePreviewPanel.tsx`)
   - Interactive buttons inside mockups (menu modal, demo links)
   - Accordion feature cards using existing `Accordion` component
   - Sticky mobile call bar
   - CTA section linking to `/paywall` (start trial) and `tel:` link

### Files modified
2. **`src/App.tsx`** — Add lazy import and `/examples` route

### Reused components
- `LandingNav` for navigation
- `Accordion` from ui components for feature cards
- `Button`, `Card`, `Dialog` for mockup interactivity
- `Tabs` for restaurant/small-business toggle

