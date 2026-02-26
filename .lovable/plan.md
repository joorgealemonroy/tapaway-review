

# Speed Up `/c/:code` NFC Card Pages

## Analysis

When someone taps an NFC card, the flow is:
1. Browser loads `/c/9NNB3N`
2. React boots → `CardResolver` JS chunk downloads (it's **lazy-loaded**, line 73 of App.tsx)
3. DB query to `nfc_cards` table
4. If claimed → `window.location.href` full-page redirect (kills SPA, reloads everything)
5. If unclaimed → checks auth via `getUser()`, then shows UI or redirects to signup

**Bottlenecks identified:**

| Issue | Impact |
|-------|--------|
| CardResolver is lazy-loaded | Extra network round-trip to download chunk before any logic runs |
| `window.location.href` for profile redirects | Full page reload instead of SPA navigation — re-downloads all JS, re-initializes React |
| Auth check (`getUser()`) runs even for claimed cards | Unnecessary network call; claimed cards redirect immediately and don't need auth |
| CardOnboarding + HubShowcase + LayoutTemplates all load eagerly inside unclaimed flow | Heavy components loaded even before user interacts |

## Plan

### 1. `src/App.tsx` — Make CardResolver a critical import (not lazy)
- Move `CardResolver` from lazy import (line 73) to a direct import alongside the other critical routes
- NFC card taps are a primary entry point — the chunk should be in the main bundle

### 2. `src/pages/CardResolver.tsx` — Use SPA navigation for profile redirects
- Replace `window.location.href = \`/\${card.destination_value}\`` with `navigate(\`/\${card.destination_value}\`, { replace: true })`
- This keeps the SPA alive, avoids full reload, and renders the profile page instantly using already-loaded React
- Keep `window.location.href` only for `external_url` destination type (must leave the app)

### 3. `src/pages/CardResolver.tsx` — Defer auth check until needed
- Move the `supabase.auth.getUser()` call (lines 84-103) out of the initial `resolveCard` flow
- Only check auth after confirming the card is unclaimed — claimed cards never need it

### 4. `src/components/card/CardOnboarding.tsx` — Lazy-load heavy sub-components
- `HubShowcase` and `LayoutTemplates` are below the fold and only visible on scroll
- Lazy-load them so the initial "Activate Now" screen renders faster

## Files Modified
- `src/App.tsx` — change CardResolver from lazy to direct import
- `src/pages/CardResolver.tsx` — SPA navigate for profiles, defer auth check
- `src/components/card/CardOnboarding.tsx` — lazy-load HubShowcase and LayoutTemplates

