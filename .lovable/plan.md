
## Problem

After a rep uploads their profile photo (the full-banner logo), the auto-matched background looks correct. But saving something unrelated (e.g. adding an Instagram link in Content) causes the page background to snap back to the previous/default color. The user wants this diagnosed and fixed with real test coverage.

## Suspected root causes (to verify, not assume)

There are three code paths that touch `background_color`, and only one of them (the photo upload) writes the sampled color. The revert points to one of these:

1. **DB write never actually persisted.** `PersonalDashboard.handleCroppedPhoto` calls `sampleBottomEdgeColor(urlWithCacheBust)` and then `UPDATE personal_profiles SET background_color = <sampled>`. If the canvas read is CORS-blocked (the sampler swallows errors and returns `null`), no DB update runs — but the in-memory `LivePhonePreview` samples on its own, so the editor still *looks* right. On the next refetch, the DB value (still `#ffffff`) wins and the bg "reverts."

2. **Stale `pendingBgColor` in `DashboardDesignTab`.** `pendingBgColor` is initialized from the `backgroundColor` prop once and never re-syncs when the parent updates it after the photo upload. That means `hasChanges` becomes true against a stale baseline; the `UnsavedChangesBar` can then overwrite the freshly-sampled bg back to white when saved — even from a different tab context.

3. **Refetch clobber after Content save.** Content-tab save calls `loadData()` (line 1025 `onUpdate={() => loadData()}`), which re-reads the profile. If (1) is true, the refetched row still has the old bg and stomps the good in-memory value.

## Investigation steps

1. Query the affected profile directly to see whether `background_color` was actually written after the photo upload:
   ```
   SELECT id, username, background_color, profile_photo_url, updated_at
   FROM personal_profiles WHERE id = '<current profile>';
   ```
   This confirms whether the DB matches the visible bg.
2. Add temporary `console.debug` around the sample + update in `handleCroppedPhoto` to log: sampled hex, update error, and whether the branch even ran.
3. Reproduce in the preview with the sales-partner demo hub, then check network + console.

## Fix plan (apply after diagnosis)

**A. Guarantee the sampled bg is persisted, and surface failures.**
- In `handleCroppedPhoto`, sample from the `publicUrl` (no `?t=` cache-buster — the query string can defeat CORS caching), and if `sampled` is `null`, log a `console.warn` so we know the sampler failed instead of silently doing nothing.
- Fold the sampled bg into the *same* `UPDATE` as `profile_photo_url` (one round-trip, atomic).
- After the update, verify with a `.select("background_color").single()` and set `profile` from the returned row instead of the local `nextBgColor`.

**B. Keep `DashboardDesignTab` pending state in sync.**
- Add a `useEffect` that resets `pendingBgColor`, `pendingHeaderType`, `pendingHeaderColor`, `bgColorInput`, `customColorInput` whenever the corresponding prop changes and `userPickedBg.current === false`. Prevents the Unsaved-Changes bar from re-saving stale white over a freshly-sampled color.

**C. Make the live renderer honor the saved value first.**
- In `PersonalProfilePage` and `ProfilePreviewRenderer`, when `header_type === 'banner'` and `background_color` is already set to a non-default value, skip the runtime sampler and use the stored value. Only sample at runtime when `background_color` is still the default. This makes the visible bg match what's actually in the database and eliminates the "looks fine until refetch" illusion.

**D. Re-run the tests.**
- Manual pass in the preview: upload logo → confirm bg matches → open Content → add Instagram → save → confirm bg unchanged → hard refresh → confirm bg still correct.
- Repeat with a high-contrast image (dark logo on light corners) to confirm the sampled anchor sticks.
- Repeat while logged in as a rep viewing the demo, then again as the eventual owner, so we catch any RLS mismatch on the `background_color` update for rep-created demos.
- Confirm with a direct DB query that `background_color` is the sampled hex, not `#ffffff`, after each save.

## Out of scope

No visual/design changes, no schema changes, no changes to other tabs. This is strictly a persistence + state-sync fix on the banner background.
