## Storage RLS + Client-Dashboard-style Rep Editor + Social Deep Links

Migration for storage policies has already been applied. The rest is code-only.

### 1. Upload paths — user-scoped
`src/pages/rep/RepDemoCreate.tsx`: change upload prefixes so RLS matches.
- Logo → `${user.id}/logo-${ts}-${filename}`
- Gallery → `${user.id}/gallery-${ts}-${filename}`
- Header banner (new) → `${user.id}/banner-${ts}-${filename}`

Storage policies (already migrated) allow `restaurant-logos` writes when the first path segment equals `auth.uid()` and the caller is a sales rep or admin.

### 2. `src/lib/deepLinks.ts` (new)
Exports `detectPlatform()` and `toSocialDeepLink(rawUrl, platform, device?)`.
- Instagram → iOS `instagram://user?username={u}`, Android `intent://instagram.com/_u/{u}/#Intent;package=com.instagram.android;scheme=https;end`.
- Facebook → `fb://facewebmodal/f?href=https://facebook.com/{page}`.
- TikTok → `snssdk1128://user/profile/{username}`.
- Web / unparseable → original URL.

`src/lib/sanitizeUrl.ts`: extend allowed protocols to include `fb:`, `snssdk1128:`, `intent:`.

### 3. Rep editor tabs — `src/pages/rep/RepDemoCreate.tsx`
Left column becomes shadcn `Tabs` (Links · Design · Leads). All new state lives inside the existing `restaurants.settings` JSON — no schema changes.

**Links** — Hero identity (name/phone/bio), dynamic content blocks array `{id,title,url,kind,active}` with `+ Add Link`, presets for Email/Website/Directions; social block inputs (Instagram, Yelp, Facebook, TikTok stored under `settings.socials`).

**Design** — Header Style (`solid` / `image` / `full_banner`) with landscape uploader (user-scoped path), page background hex bound to `secondary_color`, primary color picker, theme dropdown, "Founding Creator Badge" switch → `settings.badges.founding`, "Contact Card" switch → `settings.contact_card_enabled`.

**Leads** — "Lead Capture Form" switch → `settings.lead_form_enabled`, mock empty-state submissions card.

Right column: upgraded `LivePhonePreview`. 50/day cap, slug generation, PDF step 2, and admin-approval gate stay intact.

### 4. `src/components/rep/LivePhonePreview.tsx` (rewrite)
- Header banner strip driven by `settings.header_style` (solid = secondary color, image/full_banner = uploaded landscape).
- Circular logo overlaps banner bottom.
- Business name → bio → optional Founding Creator pill.
- "Save Contact" pill under bio when `contact_card_enabled`.
- Row of circular social icons (IG gradient, FB blue, TikTok black, Yelp red) piped through `toSocialDeepLink`.
- Custom action blocks rendered from `settings.blocks` with slide-in transition.
- Lead capture input "Connect - Join our VIP Club for updates!" when enabled.

### 5. Public hub — `src/pages/ReviewHub.tsx`
Wrap existing Instagram / (Facebook / TikTok if present) buttons with `toSocialDeepLink` so mobile taps launch the native app. No layout changes.

### 6. Solo Pro default
- `src/pages/Admin.tsx` `approveHub`: on approve, also `plan_type: 'solo_pro'` — success toast reflects it.
- `supabase/functions/create-rep-onboarding/index.ts`: change hard-coded `plan_type: "monthly"` fallback to `"solo_pro"` for rep-driven onboarding (owner-claim path).

### Out of scope
- No new bucket, no changes to commission math, RLS on `restaurants`, or auth flows.
- Full Design-tab port to the public hub beyond social deep-links (follow-up).
- Real lead-submission persistence (Leads tab is UI + toggle only).
