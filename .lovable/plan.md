
# Increase Image Size Limits Across the App

## Overview

Multiple components have restrictive image size limits (2MB-5MB) that could frustrate users. We'll raise all limits to 20MB with automatic compression for anything over 2MB, so users can upload any reasonable photo without errors.

## Changes

### Unified approach
- **Hard limit**: 20MB (reject above this -- likely not a real photo)
- **Compression threshold**: Automatically compress anything over 2MB down to ~1200px max dimension at 85% JPEG quality (already done in some places)
- Error message: "Image must be less than 20MB"

### Files to update

1. **`src/components/personal/signup/LinksStep.tsx`** (profile photo) -- Already allows 15MB with compression; raise to 20MB
2. **`src/components/personal/LinkModal.tsx`** (cover image + thumbnail) -- Currently 5MB and 2MB; raise both to 20MB with compression
3. **`src/components/personal/HeaderCustomizer.tsx`** (header image) -- Currently 5MB; raise to 20MB with compression
4. **`src/components/personal/BlocksManager.tsx`** (block images) -- Currently 5MB; raise to 20MB with compression
5. **`src/components/personal/DashboardContactCard.tsx`** (contact card image) -- Currently 5MB; raise to 20MB with compression
6. **`src/components/personal/DashboardBlocksManager.tsx`** (dashboard block images) -- Already compresses over 5MB; raise limit to 20MB
7. **`src/components/personal/DashboardDesignTab.tsx`** (design tab images) -- Already compresses over 5MB; raise limit to 20MB
8. **`src/pages/personal/PersonalDashboard.tsx`** (profile photo in dashboard) -- Already allows 15MB; raise to 20MB

Each file gets the same pattern: reject > 20MB, compress > 2MB using canvas resize to 1200px max + 85% JPEG quality.
