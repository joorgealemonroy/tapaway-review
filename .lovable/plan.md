## What I checked

I reproduced your flow in the preview with your `tap@tapaway.co` session: `/` → Dashboard button → `/dashboard` → `/admin`, and it stayed on `/admin`. So the `/dashboard` routing itself is fine — the bounce comes from an admin page's own guard, not from the dashboard redirect.

Eight admin pages share the same guard shape (verified in the code):

```text
useEffect(() => {
  if (!adminLoading && !isAdmin) navigate('/');
}, [adminLoading, isAdmin]);
```

in `AdminReps`, `AdminCommissions`, `AdminCompSettings`, `AdminDemoRequests`, `AdminPayouts`, `AdminTaxReview`, `AdminCards`, `AdminPrintQueue`.

`useAdminAccess` sets `isAdmin = false, loading = false` any time `user` is momentarily null — which happens on a session-restore ordering blip or an auth state change (token refresh / preview iframe reload). At that instant every one of those pages fires `navigate('/')` and drops you on the homepage while you're still signed in. That matches what you saw; the exact trigger event isn't confirmed yet, so step 1 below verifies it.

I also noticed a secondary symptom in your network log: the same `sales_reps` lookup firing ~8 times in 2 seconds, which points at a re-render loop around `useSalesRep` (used by the landing nav).

## Fix

1. **Confirm the trigger.** Add temporary logging in `useAdminAccess` for the `user → null` transition and reproduce with a token refresh / tab refocus on an admin page, so the fix targets the real event.
2. **Make `useAdminAccess` non-flapping.** Keep `loading = true` while `authLoading` is true, and don't downgrade a previously-confirmed admin to `isAdmin = false` on a transient null user — only clear admin state on an explicit `SIGNED_OUT`.
3. **Harden the eight guards.** Require `!authLoading && user` before redirecting, and send unauthenticated users to `/auth` (not `/`). Non-admin signed-in users keep going to `/` as today.
4. **Fix the `useSalesRep` request loop** so the landing nav doesn't re-query `sales_reps` in a tight loop (stabilize the effect dependencies / guard on a resolved user).

## Notes

Frontend routing and hook logic only — no database, RLS, or business-logic changes. Admin permissions themselves are unchanged; this only stops a temporary auth blip from being treated as "not an admin".
