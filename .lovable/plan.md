## Fix three security findings

### 1. `validate-promo-token` — Unauthenticated token invalidation (error)
File: `supabase/functions/validate-promo-token/index.ts`

- Keep the read-only "is this token valid?" path public (called from `Onboarding.tsx` line 103 before the user is signed in — required for the promo landing UX).
- When `markUsed: true` is requested:
  - Require an `Authorization: Bearer <jwt>`; reject otherwise with 401.
  - Verify the JWT via `supabase.auth.getUser(token)`.
  - Ignore any `usedByUserId` from the body — always use the authenticated `user.id`.
- Add IP-based rate limiting via the existing `_shared/rateLimit.ts` (e.g. 20/min validation, 5/min markUsed).
- Update caller `src/pages/Onboarding.tsx` line 592: drop `usedByUserId` from the body (the server now derives it from the JWT, which the supabase-js client attaches automatically post-signup).

### 2. `fetch-link-metadata` — Unauthenticated open proxy (warn)
File: `supabase/functions/fetch-link-metadata/index.ts`

- Require a valid Supabase JWT (only caller is `LinkModal.tsx` from an authenticated dashboard). Return 401 if missing/invalid.
- Keep the existing rate limit, but key it by `user.id` instead of IP once authenticated.
- Leave protocol validation + 50KB cap + 8s timeout in place. No allowlist needed (users paste arbitrary URLs by design).
- No client changes needed — `supabase.functions.invoke` already attaches the session JWT.

(Note: `scrape-link-bio` is flagged in the description but not in the finding list. Skipping to keep scope to the three reported findings.)

### 3. `TEST_ACCOUNTS.md` — Hardcoded test password (error)
File: `TEST_ACCOUNTS.md`

- Replace every occurrence of `TapawayTest123!` with the placeholder `<set out-of-band — ask an admin>`.
- Update the "All test accounts use the same password" line to instruct devs to retrieve the password from 1Password / admin handoff.
- No code references the literal password (`rg` confirms it lives only in this doc), so this is a docs-only change.
- Note in the closing message: the user should rotate the actual auth passwords for `test-owner1/2/3@tapaway.co` via the Cloud Users panel since the old value is in git history.

### Files touched
- `supabase/functions/validate-promo-token/index.ts` (auth gate + rate limit + drop body-supplied user id)
- `supabase/functions/fetch-link-metadata/index.ts` (auth gate, user-keyed rate limit)
- `src/pages/Onboarding.tsx` (remove `usedByUserId` from markUsed call)
- `TEST_ACCOUNTS.md` (strip plaintext password)

### Out of scope
- Google Maps client key restriction (separate warn finding, requires Google Cloud Console action by the user).
- `scrape-link-bio` hardening (not in the three requested findings).
- Any DB / RLS changes.

After applying, mark the three findings as fixed via `manage_security_finding` and update security memory.
