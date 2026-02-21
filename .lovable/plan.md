

# Fix Referral Link Using Lovable Preview Domain

## Problem
The referral link on the Affiliate Dashboard uses `window.location.origin` to build the URL. In the Lovable preview environment, this produces a long, ugly link like:
`https://db97f54f-4c1d-4910-ae17-ca4c23111c49.lovableproject.com/personal/signup?ref=jorge`

Instead, it should always show the production domain:
`https://tapaway.co/personal/signup?ref=jorge`

This is the same pattern already documented in your project memory -- email links use `FRONTEND_URL` to avoid leaking preview domains.

## Fix

**File:** `src/pages/affiliate/AffiliateDashboard.tsx`

Replace `window.location.origin` on line 130 with a hardcoded production base URL (matching the pattern used elsewhere in the app).

Change:
```tsx
const link = `${window.location.origin}/personal/signup?ref=${affiliateInfo.referral_code}`;
```

To:
```tsx
const link = `https://tapaway.co/personal/signup?ref=${affiliateInfo.referral_code}`;
```

This is a one-line change. The link will always show the clean production URL regardless of which environment the dashboard is viewed from.

