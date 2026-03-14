

# Friendly Unsupported-Platform Fallback

## Problem
When someone pastes a URL from a platform we don't support, they get a raw error toast. We should catch this client-side *before* calling the edge function and show a friendly message encouraging them to start fresh.

## Changes — `src/pages/personal/ImportProfile.tsx`

1. **Add a client-side domain check** before calling the edge function. Parse the hostname from the input URL and check it against `SUPPORTED_PLATFORMS`. If it doesn't match:
   - Skip the API call entirely
   - Set a new state variable (e.g. `unsupportedPlatform: true`) to render a friendly inline message

2. **Remove `link.me` from `SUPPORTED_PLATFORMS`** (per request — treat it as unsupported going forward)

3. **Render a friendly fallback card** when `unsupportedPlatform` is true (instead of the result or the "Works with" chips). Something like:

```text
┌─────────────────────────────────────┐
│  😕  Sorry, we can't transfer       │
│  from that platform yet.            │
│                                     │
│  But the good news? Starting fresh  │
│  on TapAway takes under 2 minutes.  │
│                                     │
│  [ Create Your Page → ]             │
│                                     │
│  We currently support:              │
│  Linktree · Stan Store · Beacons…   │
└─────────────────────────────────────┘
```

4. **Also handle the edge function 400 error gracefully** — if the API still returns "Unsupported platform", show the same friendly UI instead of an error toast. This covers edge cases where the client-side check might miss.

5. **Reset `unsupportedPlatform` state** when the user changes the URL input.

## Files
- `src/pages/personal/ImportProfile.tsx` — add unsupported state, client-side domain check, friendly fallback UI, remove `link.me` from supported list
- `supabase/functions/scrape-link-bio/index.ts` — remove `link.me` from `ALLOWED_DOMAINS`

