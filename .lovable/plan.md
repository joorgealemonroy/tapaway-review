

# Remove "Create your digital card — free" Signup Bar from Profile Pages

## Overview

Remove the `ProfileSignupBar` component that appears at the bottom of personal profile pages, since TapAway no longer offers the free personal signup flow publicly.

## Changes

### `src/pages/personal/PersonalProfilePage.tsx`
- Remove the `<ProfileSignupBar profileId={profile.id} />` render (~line 1479)
- Remove the import of `ProfileSignupBar` (~line 22)

### `src/components/personal/ProfileSignupBar.tsx`
- Delete the file entirely (no longer used anywhere)

### `src/components/landing/FreeTrialPopup.tsx`
- Delete the file entirely (already unused — not imported anywhere)

