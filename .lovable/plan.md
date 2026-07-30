## Goal

Stop Facebook / LinkedIn / Yelp links from collapsing to their first path segment (the `people` autofill bug), and flag links already damaged by the old behavior.

## 1. Normalization logic — `src/lib/platformLinks.tsx`

- Extend the `stripHost` helper with a `keepPath` option so it can return the full remaining path (and query string) instead of splitting on `/` and taking index 0.
- Add a shared `multiSegmentHandle(raw, hostPattern, prefixRe, keepQuery)` helper: keeps the whole path when it begins with a known multi-segment prefix, otherwise falls back to the existing single-segment behavior so plain handles keep working.
- **Facebook** — prefixes `people/`, `pages/`, `p/`, `groups/`, and `profile.php` (query `?id=...` preserved). `extractValue` and `generateUrl` both route through the new handle helper; `generateUrl` rebuilds `https://facebook.com/<handle>` with no double prefix.
- **LinkedIn** — preserve full path for `in/`, `company/` (plus `school/`, `showcase/`). Bare handles still generate `https://linkedin.com/in/<handle>`; prefixed paths generate `https://linkedin.com/<path>`.
- **Yelp** — preserve full path for `biz/`. Bare handles still generate `https://www.yelp.com/biz/<handle>`; prefixed paths generate `https://www.yelp.com/<path>`.
- Bare domains (`facebook.com`, `yelp.com`) continue to be rejected by `isBareDomainHandle` / `safeUrl`, so the existing "Enter your page name" toast in `LinkModal` still fires.

## 2. Flag legacy truncated links — `src/lib/brokenLinks.ts`

- Expand `isBrokenPlatformUrl` so, in addition to the recursive-domain check, it returns `true` when the parsed handle/last path segment is exactly one of: `people`, `pages`, `p`, `profile.php`, `company`, `in`, `biz`.
- This feeds the existing "Needs Fixing" callouts on the rep, personal and admin dashboards, prompting manual re-entry for links the old bug permanently truncated. Detection only — no data is mutated.

## Verification

- Sanity-check parsing for: `facebook.com/people/Biz-Name/61551234567/`, `https://www.facebook.com/profile.php?id=6155…`, `facebook.com/mypage`, `@mypage`, `facebook.com` (rejected), `linkedin.com/company/acme`, `yelp.com/biz/some-place`.
- Confirm edit → save → reopen round-trips the full value in the link editor.
- Run a clean typecheck build.
