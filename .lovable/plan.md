

# Eliminate Redundant DB Query in NFC Card → Profile Flow

## Current Flow (3 sequential DB queries)

```text
/c/9NNB3N
  → CardResolver: SELECT from nfc_cards          (~100ms)
  → navigate("/adrianlasislas")
  → UsernameResolver: SELECT from personal_profiles  (~100ms)  ← REDUNDANT
  → PersonalProfilePage: SELECT profile + links + blocks  (~150ms)
```

CardResolver already knows `destination_type === "profile"`, yet UsernameResolver re-queries the database just to confirm it is a personal profile. That is a wasted round-trip.

## Optimized Flow (2 sequential DB queries)

```text
/c/9NNB3N
  → CardResolver: SELECT from nfc_cards          (~100ms)
  → navigate("/adrianlasislas", { state: { type: "personal" } })
  → UsernameResolver: sees state.type === "personal" → SKIP query
  → PersonalProfilePage: SELECT profile + links + blocks  (~150ms)
```

## Changes

### 1. `src/pages/CardResolver.tsx` — Pass route state on profile redirect

Change the navigate call (line 63) to include state indicating this is a known personal profile:

```typescript
navigate(`/${card.destination_value}`, { replace: true, state: { type: 'personal' } });
```

Also change the loading/redirecting screen (lines 237-241) from teal gradient to dark, matching the profile theme to prevent a color flash:

```typescript
if (cardStatus === "loading" || cardStatus === "redirecting") {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white/60" />
    </div>
  );
}
```

### 2. `src/pages/UsernameResolver.tsx` — Skip DB query when state confirms type

Read `location.state?.type` and if it equals `"personal"`, immediately render `PersonalProfilePage` without any database query:

```typescript
const location = useLocation();
const routeState = location.state as { type?: string } | null;

// If we already know the type from navigation state (e.g. from CardResolver), skip the query
if (routeState?.type === 'personal') {
  return <PersonalProfilePage />;
}
```

This eliminates the ~100ms redundant query entirely for NFC card taps.

## Files Modified
- `src/pages/CardResolver.tsx` — pass `{ type: 'personal' }` state, dark loading screen
- `src/pages/UsernameResolver.tsx` — skip DB query when state confirms profile type

## Impact
- Saves one full database round-trip (~100ms) on every NFC card tap to a claimed profile
- Eliminates teal-to-dark color flash during redirect
- No change to behavior for direct URL visits (no state = existing query path)

