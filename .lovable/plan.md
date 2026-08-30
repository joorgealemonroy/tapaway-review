# Traffic tracking audit + rebuilt analytics, Meta retargeting, consent

## Part 1 — /rebornwraps audit (read-only, already performed)

Findings from the live event table (no data changed):

| Metric | Value |
| --- | --- |
| Raw `profile_visit` events (all time, since Mar 25) | 569 |
| All recorded events for this hub | 801 |
| Events with a bot/crawler user agent (Googlebot etc.) | 53 |
| Events whose referrer is a Lovable preview / localhost | 22 |
| Extra events from the same device inside one minute (repeat fires) | 28 |
| Same device + same second | 1 |
| Distinct device+referrer signatures (all time) | 221 |
| Deduplicated legitimate view estimate | ~470–490 |
| Unique-session estimate (device+referrer+day, bots removed) | ~358 |

The 178 shown in the Lovable panel is a different system (published-site page views for the last 30 days), which is why it never matches the hub number.

**Why the numbers are inflated and unreliable**

1. No session ID and no event ID are stored. `visitor_info` holds only `referrer` and `userAgent`, so "visitors" cannot be distinguished from "events" — every dashboard label that says visitors is actually counting events.
2. Two separate code paths insert `profile_visit`: `src/hooks/useProfileData.ts` (`trackProfileVisit`) and `src/pages/personal/PersonalProfile.tsx`. Any page that mounts both paths, or remounts on a route change/refresh, records another view. This is the source of the 28 same-device-within-a-minute repeats.
3. No bot filtering at all — Googlebot alone accounts for 22 views, all crawler UAs 53.
4. Preview and admin traffic is counted like a real customer.
5. Inserts go straight from the browser to the table, so there is no server-side validation, rate limit or dedup window.

Nothing gets deleted. Raw rows stay exactly as they are; the fixes are all in how events are written going forward and how they are counted for display.

## Part 2 — Reliable site-wide tracking

- New `analytics_hits` table (raw, append-only) plus a validated view used for all dashboard totals. Existing `personal_analytics` / `analytics_events` stay in place and keep feeding history; the new table becomes the single write path going forward.
- Every hit carries: anonymous session ID (rotating, sessionStorage/localStorage), a client-generated event ID for idempotency, page path, hub id, referrer, UTM fields, device category, coarse region, and a `traffic_class` (`human`, `bot`, `internal`, `preview`).
- One shared `useAnalytics` client that fires through a single hardened edge function. Duplicate suppression on event ID plus a short same-session/same-path window, so remounts, Strict Mode double-effects, prefetches and refreshes stop double-counting.
- Additional signals: new vs returning, entry/exit page, time on page, scroll depth, CTA clicks (review, social, menu, directions, call, text, website), lead-form submissions, checkout start and purchase, NFC/QR visits identified by campaign parameter.
- Classification instead of deletion: admins, preview/localhost, known crawlers, uptime checks and probable bots are labelled and excluded from headline totals but remain queryable.
- No fingerprinting. No stored raw IP — only a short-lived rotating salted hash for abuse/dedup, with the retention window documented in the policy.
- The two legacy insert sites are replaced by the single tracker so the double-fire cannot recur.

## Part 3 — Meta Pixel + Conversions API

- Browser Pixel and a server-side CAPI edge function sharing one `event_id` per event so Meta deduplicates.
- Standard events: PageView, ViewContent, Lead, Contact, InitiateCheckout, Purchase, plus one custom `HubAction` event for hub button taps.
- UTM/campaign attribution passed through, test-event support, explicit production vs test mode, delivery logging with no secret values.
- Nothing fires until consent allows it. No passwords, form contents, dashboard activity or identifying URL parameters are ever sent; advanced matching only with hashed data the visitor knowingly submitted.
- Requires two secrets — I will request `META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN` from you when that step starts.

## Part 4 — Privacy and consent

- Consent banner with equally weighted Accept All / Reject Non-Essential / Manage Preferences, split into essential, analytics and advertising.
- Advertising events gated on consent state; persistent "Privacy Choices" link; "Do Not Sell or Share" control; Global Privacy Control signal honoured automatically.
- Stored consent record: policy version, timestamp, chosen categories; reopenable at any time.
- Privacy Policy and Cookie Policy rewritten to match what is actually collected, retention, Meta as a provider, retargeting and how to submit requests, with the Last Updated date refreshed and existing styling kept. The new legal text will be flagged for your attorney — no compliance claims are made.

## Part 5 — Admin analytics section

Tabs: Overview, Hub Analytics, Traffic Quality, Acquisition, Engagement, Conversions, Meta Tracking, Privacy & Consent.

Per hub: raw views, validated views, unique sessions, returning visitors, suspected bot events, internal/preview events, CTA interactions, sources, conversion rate, date-range comparison. Every tile labelled so events are never presented as visitors.

A /rebornwraps drill-down showing the exact breakdown above and why each bucket was filtered. Meta diagnostics panel: pixel status, CAPI status, last successful event, dedup status, recent errors — no secret values shown.

## Technical notes

- Migrations: `analytics_hits` (+ GRANTs, RLS, indexes), a validated-events view, a consent-record table, a Meta delivery log. Hub owners can read only their own hub's aggregates; individual visitor rows are admin-only.
- New edge functions: `track` (validated ingest, bot classification, dedup, hashed-IP rate limit) and `meta-capi`.
- Historical rows are untouched; the admin UI reads legacy tables for pre-cutover history and the new table after.
- Delivered in the order above so tracking is trustworthy before Meta and consent land on top of it.
- Verification: duplicate-fire test, RLS permission test, consent on/off behaviour, mobile layout pass, and a Meta test-event dedup check.
