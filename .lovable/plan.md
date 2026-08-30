# Fix the /admin/locations update-depth crash

Error `err_1788091013780_9tz4kd` (React #185, "Maximum update depth exceeded") is caused by the marker layer in `src/components/admin/LocationsMap.tsx`, not by the Google configuration. Nothing about the API key, Map ID, env values or hydrated coordinates changes.

## The loop

In the `Markers` component:

```text
render → AdvancedMarker gets a NEW inline ref function `(m) => setRef(l.id, m)`
       → React detaches the old ref: setRef(id, null)  → setMarkers(...) deletes the entry → state change
       → React attaches the new ref: setRef(id, marker) → setMarkers(...) adds the entry → state change
       → re-render → new inline ref functions → repeat forever
```

The existing identity guard (`prev[id] === marker`) never fires, because the detach call always arrives first with `null` and mutates state. 137 markers means 274 state updates per render pass, which trips React's depth limit within a second — matching "the map renders briefly and then crashes".

Two secondary amplifiers:

- The clusterer effect depends on the `markers` state object, so every one of those updates clears and re-adds all 137 markers.
- `MapShell` monkey-patches `console.error` and calls `setGmCode` / `setFault` from inside it. React's own error/warning logging goes through `console.error`, so a render warning can itself trigger a state update during render — a second, independent loop path.

## The fix

All in `src/components/admin/LocationsMap.tsx`:

1. **Marker instances move out of state into a ref.** Keep `markersRef = useRef<Map<string, Marker>>`. Marker objects are never rendered, so they don't belong in state.
2. **Stable ref callbacks.** Cache one callback per location id (`useRef<Map<string, (m) => void>>`), so the same function identity is passed on every render and React stops detaching/reattaching. On attach, store the marker and add it to the clusterer; on detach, remove it. No `setState` in the ref path at all.
3. **Clusterer created once per map instance** in an effect keyed only on `map`, with `clearMarkers()` + `setMap(null)` cleanup when the map unmounts. Markers are added/removed incrementally through `addMarker`/`removeMarker` rather than a full rebuild on every change.
4. **fitBounds runs on a stable signature.** Compute `signature = ids+rounded coords joined` with `useMemo`, store `lastFittedRef`, and skip the fit when the signature is unchanged. The effect depends only on `[map, signature]` — never on bounds, zoom, center or a constructed `LatLngBounds`. No camera/bounds listeners are added, so a fit can't retrigger itself.
5. **Remove the `console.error` patch.** Replace it with the supported `gm_authFailure` hook plus a one-shot `window.addEventListener("error", ...)` filter that reads the Google error code from the script's own error event, and guard both setters so an identical value returns the previous state. Diagnostic copy and all fault branches stay exactly as they are.
6. **Every remaining setter is identity-guarded** (`setFault(f => f ?? next)`, `setSelectedId` no-ops when unchanged).

The map, clustering, colored pins, legend, info cards, filters, route queue and Record Visit all stay unchanged in behaviour.

## Verification before publishing

- `tsgo` typecheck and production build pass.
- Dev-mode run against the real 137-location dataset with React StrictMode warnings on: load `/admin/locations`, confirm all mapped markers/clusters render and the console shows no maximum-depth warning.
- Leave the page idle 5+ minutes; reload 10+ times.
- Exercise each status filter individually and clear all filters; confirm markers and the list stay in sync and fitBounds runs once per change.
- Pan/zoom repeatedly; open and close several marker cards; add to route; open and cancel Record Visit.
- Navigate between `/admin`, `/admin/analytics`, `/admin/locations` repeatedly (mount/unmount clusterer cleanup check).
- Publish, then repeat the core tests on `https://tapaway.co/admin/locations`.
- Error `err_1788091013780_9tz4kd` is left untouched and marked resolved only after the published build passes.

## Report at the end

Exact loop found, files changed, fix applied, production URL tested, marker count rendered. Other workstreams (admin headers, broken-link classification, `cardFrontArt` errors, consent, Meta) stay paused until the published page is stable.
