

# Swap Personal & Business Landing Pages

## Overview

Make the Personal landing page the default at `/` (tapaway.co) and move the Business landing page to `/business`. Everything else stays the same — just swapping which page is the homepage.

## Changes

### 1. Routes (src/App.tsx)

- `/` renders the **Personal** page (currently renders Index/Business)
- `/business` renders the **Business** page (already exists as an alias, will become primary)
- `/personal` redirects to `/` (so old links still work)

### 2. Navigation Toggle (src/components/landing/ProductNavToggle.tsx)

- "Personal" links to `/`
- "Business" links to `/business`
- Active state detection updated accordingly

### 3. Desktop Nav (src/components/landing/DesktopNav.tsx)

- Update `isPersonal` logic to check if NOT on `/business`
- "Personal Cards" link removed (already on personal by default)
- CTA links updated: default signup goes to `/personal/signup`, business goes to `/start`

### 4. Mobile Nav (src/components/landing/MobileNav.tsx)

- Same toggle swap: "Personal" links to `/`, "Business" links to `/business`
- Active state detection updated

### 5. Personal Page Footer (src/pages/Personal.tsx)

- "For Business" link changed from `/` to `/business`

### 6. Business Page (src/pages/Index.tsx)

- No content changes needed, just served at `/business` instead of `/`

## What stays the same

- All dashboard routes (`/dashboard`, `/personal/dashboard`)
- All signup routes (`/personal/signup`, `/start`)
- Profile slugs (`/:username`)
- Auth, admin, rep routes — all unchanged
- The DashboardSwitcher and DashboardSelector logic — unchanged

