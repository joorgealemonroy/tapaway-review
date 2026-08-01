## What I verified

- `ErrorBoundary` posts to the `track-event` function with `restaurantId: "system"` + `eventType: "error"`. That function requires `restaurant_id`, only accepts a whitelist of event types (no `error`), and validates the id against `restaurants` — so every report is rejected and swallowed by `.catch(() => {})`. Nothing about your `err_1785569928974_ooskvw` was ever stored.
- `PersonalDashboard` renders `if (!profile) return null;` — a dead blank page on any load hiccup on the admin/rep hub-preview path (I reproduced a blank render once on `/dashboard?admin_view_personal=…`, and a clean render on a retry).
- `useSalesRep` fetches per hook instance with no shared cache, so every component mounting it (nav, shell, page) issues its own identical `sales_reps` query — that's the 3x storm in your network log.

## Plan

### 1. `client_errors` table (migration)
Columns: `id`, `error_message`, `stack_trace`, `component_stack`, `route`, `user_id` (nullable), `user_agent`, `created_at`.
Access: anyone (signed-in or not) may write an error report; only admins can read. Grants for `anon`, `authenticated`, `service_role` included with the table.

Ownership rule: `user_id` is never taken from the request body. The client insert omits it and a `BEFORE INSERT` trigger stamps `auth.uid()` — signed-in reports are attributed to the real session, anonymous reports store `NULL`. Insert policy rejects rows whose `user_id` doesn't match `auth.uid()` (or is null for anon).

### 2. `ErrorBoundary`
- Drop the `track-event` call; insert into `client_errors` instead (message, truncated stack + component stack, `window.location.pathname + search`, user agent).
- `console.error(error)` with the real Error object in every environment.
- Fallback UI gains a "Show details" toggle (message + component stack) and a "Copy details" button alongside the existing error ID and Reload.

### 3. Blank-screen fix in `PersonalDashboard`
- Track *why* the profile is missing (fetch/RLS error vs. empty result) in state.
- Replace `return null` with a visible card: "Unable to load this hub", the specific reason, a **Retry** button (re-runs `loadData`), and a context-aware second button — Back to Admin for admins, Back to My Businesses for reps, Home otherwise.

### 4. `sales_reps` request de-duplication
Add a module-level cache + in-flight promise map in `useSalesRep`, keyed by `userId | impersonateRepId`, so concurrent hook instances share one request and remounts reuse the resolved row. Cache invalidates on user change / sign-out.

### 5. Verify
- Typecheck clean.
- Drive the preview with your admin session: load a rep hub via `/rep/restaurants?admin_view_rep=…` → Edit, confirm exactly **one** `sales_reps` request per load.
- Trigger a deliberate render throw in a throwaway route to confirm a row lands in `client_errors` **with the correct `user_id` for a signed-in session** and that the details toggle shows the stack. If that signed-in insert check can't be run, I'll say so rather than call it verified.

### Admin surface (optional, included)
A "Recent errors" section on the admin side listing the latest `client_errors` rows (time, route, message, user) so you can hand me a real stack next time.

## Notes

One new logging table plus frontend changes. No changes to hubs, approvals, commissions, or existing RLS. After it ships I'll tell you exactly how to reproduce and where to read the captured error.
