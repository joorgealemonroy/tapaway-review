

# Phase 1: B2B Landing Page Pivot (Personal Routes Stay Hidden)

## Summary

Make `/` the B2B landing page, remove all public-facing Personal links/toggles, but keep personal signup routes alive as hidden/invite-only paths.

---

## 1. Routing (`src/App.tsx`)

- Change `"/"` from `<Personal />` to `<Index />` (Business landing)
- Add `/business` → redirect to `/`
- **Keep all personal routes intact**: `/personal/vibe`, `/personal/signup`, `/personal/signup/complete`, `/personal/dashboard`, `/personal/pricing`, `/import`, `/u/:username`
- Remove eager import of `Personal` page (no longer needed at root)

## 2. Landing Page (`src/pages/Index.tsx`)

- Remove "For Businesses" label banner (it's now the only product)
- Update Helmet title → "TapAway | Smart NFC Cards & Review Tools for Businesses"
- Update meta description for B2B focus
- Footer: remove "Personal Cards" link, keep socials + legal

## 3. Desktop Nav (`src/components/landing/DesktopNav.tsx`)

- Remove `ProductNavToggle` import and rendering
- Remove "Personal Cards" conditional link
- Simplify CTA: always show "Start Free Trial" → `/start`
- Dashboard link: remove `isBusiness` conditional, default to `/select-dashboard`

## 4. Mobile Nav (`src/components/landing/MobileNav.tsx`)

- Remove Personal/Business segmented control
- Simplify signup CTA to always `/start` with "Start Free Trial"
- Remove `isBusiness` logic from dashboard link

## 5. Dashboard Selector (`src/pages/DashboardSelector.tsx`)

- Rebrand "Personal Dashboard" display text → "Small Business Dashboard"
- Keep routing to `/personal/dashboard` unchanged

## 6. Dashboard Switcher (`src/components/dashboard/DashboardSwitcher.tsx`)

- Rebrand "Personal" label → "Small Business"

## 7. Personal Dashboard Redirect Safety (`src/pages/personal/PersonalDashboard.tsx`)

- Change the no-profile redirect from `/personal/signup` → `/start` (prevents accidental personal signups from dashboard)

## 8. Cleanup

- `ProductNavToggle.tsx` — delete (no longer referenced)
- `Personal.tsx` — keep file but remove from root route import

---

## Files

| File | Action |
|------|--------|
| `src/App.tsx` | Reroute `/` to Index, add `/business` redirect, remove Personal eager import |
| `src/pages/Index.tsx` | Remove business banner, update meta/footer |
| `src/components/landing/DesktopNav.tsx` | Remove toggle + personal links, simplify CTAs |
| `src/components/landing/MobileNav.tsx` | Remove segmented control, simplify CTAs |
| `src/components/landing/ProductNavToggle.tsx` | Delete |
| `src/pages/DashboardSelector.tsx` | Rebrand label |
| `src/components/dashboard/DashboardSwitcher.tsx` | Rebrand label |
| `src/pages/personal/PersonalDashboard.tsx` | Change no-profile redirect |

**Not touched:** All `/personal/*` routes, `PersonalSignup`, `VibeSelection`, `ImportProfile`, `MagicLinkStep`, `PersonalProfile`, auth flow — all remain functional via direct URL.

