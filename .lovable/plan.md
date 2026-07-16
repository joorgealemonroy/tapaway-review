## Goal

Simplify the Demo Hub header so the banner IS the logo — no header-style picker, no circular profile-photo overlap, no separate logo uploader.

## Changes

**1. `src/pages/rep/RepDemoCreate.tsx` — Design tab**
- Delete the "Header Style" card (Solid Color / Image / Full Banner tri-toggle). Hard-code `headerStyle = 'full_banner'` in saved settings.
- Rename the section to just **"Banner Image"** with the existing uploader (bannerUrl). Copy: "This banner acts as your logo and header."
- Remove the entire **"Logo & Gallery" → Logo** subsection (upload button + circular preview). Keep the **Gallery (up to 3)** uploader intact under its own "Gallery" card.
- Stop writing `logoUrl` to `restaurants.logo_url` on save (or write `null`) since it's no longer edited here. Keep the DB column untouched otherwise.

**2. `src/components/rep/LivePhonePreview.tsx`**
- Remove the circular logo overlap block and the fallback initial circle.
- Remove the `-mt-10` negative margin so the business name + bio sit cleanly below the banner (small `pt-4` instead).
- Increase default banner height for `full_banner` so it reads as a proper hero (keep 160px, or bump to 180px).
- Drop the `logoUrl` prop usage inside the header area (prop can stay for type compat but is ignored).

**3. Public hub `/:slug` renderer (`src/pages/ReviewHub.tsx`)**
- Mirror the same change: banner-only header, no circular logo overlap, so the live page matches the simulator.

## Out of scope
- No DB migration. `logo_url`, `header_style`, `banner_url` columns stay as-is.
- No changes to Links tab, Leads tab, socials, gallery, color pickers, theme dropdown, or approval flow.
- No changes to other hub renderers (AvMealPrepHub, personal profiles).
