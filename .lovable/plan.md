

# iOS Toast + Default vCard Website (tapaway.co)

## Changes

### 1. `src/pages/personal/PersonalProfilePage.tsx`

**Default website to `https://tapaway.co/{username}`**: On line 906, when `contact_website` is empty, default to `https://tapaway.co/${username}` instead of leaving it undefined.

**iOS toast hint**: After `downloadVCard` (line 925), detect iOS via `navigator.userAgent` and show "Tap Create New Contact to save — photo will appear after saving" instead of the generic "Contact saved!" toast.

```typescript
// Line ~899-926
const profile = data.profile;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

await downloadVCard({
  fullName: profile.contact_name || profile.full_name,
  email: profile.contact_email || undefined,
  phone: profile.contact_phone || undefined,
  company: profile.contact_company || undefined,
  title: profile.contact_title || undefined,
  address: profile.contact_address || undefined,
  website: profile.contact_website || `https://tapaway.co/${username}`,
  profilePhotoUrl: profile.contact_photo_url || profile.profile_photo_url || undefined,
});

// ... analytics tracking ...

if (isIOS) {
  toast.success("Tap Create New Contact to save — photo will appear after saving");
} else {
  toast.success("Contact saved!");
}
```

### 2. `src/components/personal/DashboardContactCard.tsx`

Update the website field placeholder and helper text to show `https://tapaway.co/{username}` as the default.

```
placeholder: "https://tapaway.co"
helper: Leave empty to use your TapAway profile link
```

### 3. `src/lib/personalUsername.ts`

Update `getPublicProfileUrl` to always use `https://tapaway.co` as the origin instead of `window.location.origin`, so no preview/dev URLs ever leak.

## Files

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Default vCard website to `tapaway.co/{username}`, iOS-specific toast |
| `src/components/personal/DashboardContactCard.tsx` | Update placeholder/helper text for website field |
| `src/lib/personalUsername.ts` | Hardcode `https://tapaway.co` origin |

