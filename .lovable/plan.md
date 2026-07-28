# Kill the random "back to Google-search" bounce while editing a hub

## What's happening

Reps report that mid-edit (during save, reorder, or seemingly at random) the dashboard sends them away from the hub they were customizing and they end up back at the "search for the business" screen (`/rep/demo/new`). Sometimes a browser Back gets them back in; other times they have to reopen the hub and redo work.

There is no code path that directly navigates from `/dashboard` to `/rep/demo/new`. The bounce is a two-hop side effect of `PersonalDashboard`:

1. `loadData` re-runs (dependency on `requestedProfileId`/`adminViewId`, or a `setSearchParams({}, { replace: true })` in the welcome-param effect wipes `profile_id`).
2. If the profile fetch returns `[]` (a transient RLS/network hiccup, or the `profile_id` was just stripped from the URL), the rep branch runs `navigate("/rep/restaurants")` at line 287.
3. From the Businesses list they click the big "New Demo" CTA thinking it will reopen their draft — landing on `/rep/demo/new`.

Once we stop the dashboard from ever ejecting a rep who is actively editing, the "goes to the Google-search page" symptom disappears.

## Changes

### 1. `src/pages/personal/PersonalDashboard.tsx` — never eject on load hiccups
- Only run the "no profile found → send rep to `/rep/restaurants`" fallback on the **initial** mount when there is no `profile` in state yet. If a profile is already loaded, log the empty result and keep the current state instead of navigating.
- On any thrown/RLS error inside `loadData`, keep the existing `profile`/`links`/`blocks` in state, surface a small "Reconnecting…" toast, and schedule a silent retry — never `navigate()` away.
- Preserve `profile_id` when the welcome-param effect calls `setSearchParams({}, { replace: true })` (merge, don't wipe).
- Narrow `loadData`'s `useCallback` deps to `[navigate]` only, and read `adminViewId` / `requestedProfileId` from `searchParams` inside the function so incidental URL param changes (e.g. `tab=`, `upgrade=`, `welcome=`) can never re-trigger a full refetch.

### 2. `src/pages/personal/PersonalDashboard.tsx` — don't ejecting after a rep save
- `handleSaveDraft` currently forces `navigate("/rep/restaurants")` after a manual "Save Draft" click. Autosave writes the same `pipeline_status` in some paths, so any incidental status write can look like an eject. Gate the redirect strictly to the explicit button press (already true for the click, but add a `keepOnPage?: boolean` option and pass `true` from any programmatic caller).
- Confirm autosave (`executeSave` / `saveAllChanges`) never calls `handleSaveDraft` or `handleSubmitForReview`.

### 3. `src/pages/rep/RepBusinesses.tsx` — make "Edit" idempotent
- If the rep is already on `/dashboard?profile_id=<same id>`, no-op instead of re-navigating (prevents a second `loadData` that could race an in-flight autosave).
- Add a lightweight "Continue editing" button styled distinctly from "New Demo" so reps don't accidentally start a fresh Google-Places flow when they meant to reopen a draft.

## Verification

- Manual: with a rep account, open a draft, reorder links quickly, add/remove blocks, wait for autosave — confirm the URL stays on `/dashboard?profile_id=…` and no toast ejects them.
- Force a failure: temporarily block `personal_profiles` in devtools' network tab while editing → confirm we show the reconnect toast and keep the editor mounted (no `/rep/restaurants` bounce).
- Refresh `/dashboard?profile_id=<id>&welcome=true` → confirm `profile_id` survives the welcome-param cleanup.
- Click "Edit" twice in a row on the same hub in Businesses → confirm no reload flicker.

## Out of scope

No DB migrations. No behavior changes for admin impersonation, personal (non-rep) users, or the public hub renderer.
