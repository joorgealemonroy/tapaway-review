# Add Log Out Button to Admin Dashboard

Add a small "Log out" button in the top-right of `/admin` so super-admins can sign out without leaving the page.

## Changes — `src/pages/Admin.tsx`

1. **Imports**
   - Add `LogOut` to the existing `lucide-react` import block.
   - Pull `signOut` from the existing `useAuth()` destructure (currently `const { user, loading: authLoading } = useAuth()` → add `signOut`).

2. **Header layout** (currently a plain `<div>` wrapping the `h1` + email line)
   - Wrap in a `flex items-start justify-between gap-4` row.
   - Keep the existing title + "Logged in as …" text on the left.
   - Add a `Button` (variant `outline`, size `sm`) on the right with a `LogOut` icon and label "Log out".
   - On click: `await signOut(); navigate("/auth");` (the `navigate` hook is already imported and used elsewhere on this page).

No other files change. No backend or routing changes needed — `signOut` already exists in `useAuth` and clears the Supabase session.
