## Root cause (confirmed)

`src/lib/platformLinks.tsx` Facebook config:

```
extractValue: (url) => url.replace(/^https?:\/\/(www\.)?facebook\.com\//, "").split("/")[0] || url
generateUrl:  (v)   => v.startsWith("http") ? v : `https://facebook.com/${v}`
```

The strip regex only matches URLs that include a scheme. When a rep types `facebook.com/patradining` (exactly what the placeholder `facebook.com/yourpage` invites), nothing is stripped, `split("/")[0]` yields `facebook.com`, and the saved URL becomes `https://facebook.com/facebook.com`.

Verified in the database: 14 `personal_links` rows are stored as exactly `https://facebook.com/facebook.com`, all from rep-created demos in the last week. Correctly entered ones (`https://facebook.com/GreensSleevesSteakhouse`) confirm the scheme-full path works.

Same flaw affects LinkedIn, Instagram, TikTok, X, Threads, Discord, Twitch, Snapchat, Pinterest, Telegram, Venmo, and Yelp.

## 1. Centralize link normalization — `src/lib/platformLinks.tsx`

- Add `stripHost(raw, hostPattern, keepQuery?)`: trims, resolves app schemes (`instagram://user?username=x`), strips optional `scheme://` and `www.`, strips the platform host, drops query/hash, returns the first path segment with a leading `@` removed. `keepQuery` preserves `profile.php?id=…` style Facebook URLs.
- Add `isBareDomainHandle(value)` — true when a handle is really a bare domain.
- Add an internal `safeUrl(handle, build)` used by `generateUrl` for the affected platforms: returns `""` when the handle is empty or a bare domain instead of building a self-referential URL.
- Rewrite `extractValue` for Facebook, LinkedIn, Instagram, TikTok, X, Threads, Discord, Twitch, Snapchat, Pinterest, Telegram, Venmo, Yelp to use `stripHost`.

## 2. Save-time validation — `src/components/personal/LinkModal.tsx`

- In `handleSave`, compute the handle and block the save when it is empty or a bare domain; show an inline error + toast: "Enter your page name, e.g. facebook.com/yourpage".
- The existing live preview (`→ {generateUrl(inputValue)}`) shows a "Enter your page name" hint instead of a broken URL while input is invalid, so users see exactly what will be saved.

## 3. Broken-link detection — `src/lib/brokenLinks.ts` (new)

- `isBrokenPlatformUrl(link)`: returns true when the URL's single path segment equals the platform's own domain (e.g. ends in `/facebook.com`, `/instagram.com`), or when the URL is empty for a platform link.
- `getBrokenLinks(links)` helper returning the offending rows for list views.
- Pure client-side detection over existing `personal_links` data — no migration, no data modified or deleted.

## 4. Surface broken links in the UI

- **Rep** (`src/pages/rep/RepBusinesses.tsx`): a "Needs Fixing" callout above the list, styled like the existing "Changes Requested" section, listing affected hubs with a "Fix Link" button routing to that hub's dashboard.
- **Personal dashboard** (`src/components/personal/DashboardUnifiedContent.tsx`): amber warning badge on the offending link row, tooltip "This link is broken — re-enter your page name".
- **Admin** (`src/components/admin/AdminUnifiedAccountsTable.tsx`): a "Broken Links" warning badge on affected (including approved) accounts, plus a "Show only broken links" filter toggle in the table controls.

## Verification

Run a clean typecheck build; spot-check with the known bad profiles that the badge appears and that re-saving a Facebook link entered as `facebook.com/patradining` produces `https://facebook.com/patradining`.
