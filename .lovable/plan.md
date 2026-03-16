

# Email Link → Inline Email Display with Connect Button

## What changes
When a link has `link_type === "email"`, instead of rendering as a standard pill button, render it as an inline bar showing the actual email address with a "Connect" button that opens `mailto:`.

## Layout (matching image 118)
```text
┌──────────────────────────────────────────────┐
│  📧  user@email.com        [ Connect with 👤]│
└──────────────────────────────────────────────┘
```
- Rounded container with light gray background
- Mail icon + email address displayed as text (extracted from the `mailto:` URL)
- Right-aligned "Connect with" button (dark, rounded-full) with the profile owner's photo
- Clicking the button opens `mailto:` link

## Files to modify

### 1. `src/pages/personal/PersonalProfilePage.tsx` — ProfileLink component
- Add a check at the top: if `link.link_type === "email"`, render the inline email bar instead of the standard link pill
- Extract the raw email from `link.url` (strip `mailto:` prefix)
- Show a rounded container with the email text and a "Connect with [avatar]" button linking to `mailto:`
- Need to accept `profilePhotoUrl` as an optional prop for the avatar

### 2. `src/pages/personal/PersonalProfilePage.tsx` — ProfileLink usage sites (~lines 1230, 1246, 1252)
- Pass `profilePhotoUrl={profile.profile_photo_url}` to all `<ProfileLink>` instances

### 3. `src/components/personal/ProfilePreviewRenderer.tsx` — renderLink
- Add matching visual preview for email links in the dashboard preview (static, non-functional)

