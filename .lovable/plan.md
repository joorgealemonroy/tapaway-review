## 1. Re-crop the profile picture without re-uploading

**Where:** `src/pages/personal/PersonalDashboard.tsx` (profile-header avatar button around lines 975–1007).

Today the avatar button opens the file picker directly. We'll turn it into a small menu when a photo already exists:

- Wrap the avatar in a `DropdownMenu` (only when `profile.profile_photo_url` is set — otherwise keep single-click file picker).
- Menu items:
  - **Crop current photo** → sets `rawImageUrl` to the current `profile_photo_url` (with a cache-buster stripped) and opens the existing `ImageCropper` dialog. `handleCropComplete` already handles the upload/replace flow, so re-cropping just re-uploads the cropped output as `profile.jpg` — no user re-upload needed.
  - **Replace photo** → triggers the existing `fileInputRef.current?.click()` flow.
- The Camera hover overlay stays the same.

Small helper: the `ImageCropper` loads `imageSrc` via `new Image()` with `crossOrigin="anonymous"`. `personal-photos` is a public bucket already served with CORS, so cropping the live URL works. We'll strip the `?t=...` cache-buster before passing to the cropper to avoid CORS caching quirks.

No changes to `ImageCropper.tsx` needed.

## 2. Replace the ugly Google icon in the dashboard link list

**Symptom:** In the dashboard editor rows, the multicolor Google "G" (`GoogleIcon` in `src/lib/platformLinks.tsx`) sits inside a solid blue `bg-[#4285F4]` circle, so the colored G disappears into the background. On the live hub and the phone preview, Google Review renders as a white pill so the multicolor G looks correct (see `ProfilePreviewRenderer.tsx` `isWhitePill` branch).

**Fix — in `src/components/personal/DashboardUnifiedContent.tsx`:** in the two icon badges (grid tile ~line 981–987 and list row ~line 1088–1095), special-case `link.link_type === "google_review"` (and, for consistency, `"yelp"`) so the icon container uses a **white background with a subtle border** instead of `config.bgColor`. That reuses the same treatment as the live view, where the multicolor Google logo is legible.

We do NOT change `PLATFORM_CONFIGS.google_review.bgColor` — it's still used correctly on the public hub for other stylings. The override lives only in the dashboard editor rendering.

## Technical notes

- Files touched:
  - `src/pages/personal/PersonalDashboard.tsx` — dropdown on avatar, small helper to open cropper with the current photo URL.
  - `src/components/personal/DashboardUnifiedContent.tsx` — white-badge override for `google_review` / `yelp` icons in both the grid tile and pill-row renders.
- No DB, RLS, or edge-function changes.
- No changes to how links render on the public hub or phone preview.
