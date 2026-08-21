# Fix admin "Create account" redirecting to homepage

## Problem
In the admin **Accounts & Hubs** section, the **Add Account → New Solo Hub** menu item calls `navigate("/personal/signup")`. That route is deprecated and is hard-redirected to `/` in `App.tsx`, so the admin gets sent to the homepage instead of creating an account.

## Fix
1. In `src/pages/Admin.tsx`, update the `renderAccounts()` dropdown so the action creates a new account from inside the admin tool instead of the deprecated public signup path.
2. Replace `navigate("/personal/signup")` with `navigate("/admin/personal-accounts")`, which is the existing admin page containing the full **Create Account** modal and workflow.
3. Simplify the **Add Account** button copy/options if both choices now effectively go to the same admin creation tool, or keep **New Business (Legacy)** pointing to `/onboarding` and **New Solo Hub** pointing to `/admin/personal-accounts`.

## Verification
- Click the admin **Add Account → New Solo Hub** button and confirm it lands on `/admin/personal-accounts` instead of `/`.
- Verify the legacy option still routes to `/onboarding` if kept.
- Confirm no other deprecated `/personal/signup` paths remain in the admin surface.
