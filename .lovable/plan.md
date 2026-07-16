## Fix: impersonation dropped when navigating between rep tabs

### Root cause

Rep pages call `navigate('/rep/restaurants')` etc. without carrying `?admin_view_rep=<id>`. The destination page's guard runs before `RepImpersonationOverlay` re-appends the param, sees `isSalesRep = false` (admins are not reps themselves), and redirects home.

### Fix — two coordinated changes

**1. New helper `src/hooks/useRepNavigate.ts`**

Wraps `useNavigate`. When the current URL has `admin_view_rep` and the target is a string path starting with `/rep`, appends the param (idempotent; skips if the caller already set it, preserves any other query the caller added). Numeric back navigation and non-`/rep` paths pass through untouched, so the impersonation id never leaks off the rep portal.

**2. Swap `useNavigate` → `useRepNavigate`** for internal rep-portal targets in:
- `src/pages/rep/RepHome.tsx`
- `src/pages/rep/RepRestaurants.tsx`
- `src/pages/rep/RepCommissions.tsx`
- `src/pages/rep/RepDocs.tsx`
- `src/pages/rep/RepProfile.tsx`
- `src/pages/rep/RepClose.tsx`
- `src/pages/rep/RepDemoCreate.tsx`
- `src/pages/rep/RepResources.tsx`
- `src/components/rep/RepTaxBanner.tsx`

External navigations (`/auth`, `/admin`, `/`) keep plain `useNavigate`.

**3. Safe guard tweak (per user direction)**

Currently: `if (!repLoading && !isSalesRep) navigate('/')`.

Change to (using `useAdminAccess`):

```
if (!authLoading && !user) navigate('/auth');
else if (!repLoading && !adminLoading && !isSalesRep) {
  navigate(isAdmin ? '/admin/reps' : '/');
}
```

This avoids rendering a page with a null `salesRep`. If the impersonation param is somehow lost, the admin is redirected to `/admin/reps` (safety), not left on a crashing page; non-admins still get kicked to `/`.

Applied to the same guard blocks in: `RepRestaurants`, `RepCommissions`, `RepDocs`, `RepProfile`, `RepClose`, `RepDemoCreate`, `RepResources`, and `RepHome` if it has a similar guard.

### Out of scope

- No DB / RLS / edge-function changes.
- No design changes.
- `RepImpersonationOverlay`'s sticky re-append stays as a safety net.

### Technical notes

- `useRepNavigate` signature mirrors `useNavigate`: `nav(path, options?)`; `nav(-1)` supported.
- Reads `admin_view_rep` from `useSearchParams` each render so it always reflects the current URL.
- Guard uses already-imported `useAdminAccess`; waits for both `adminLoading` and `repLoading` to be false before deciding.