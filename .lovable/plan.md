## Goal
SMS Marketing passed carrier approval. Remove the temporary lock UI, add live-status polish, verify the send function's secret handling, and make the feature reachable for mobile users.

## Verified current state
- Both `SmsMarketingTab.tsx` and `RestaurantSmsMarketingTab.tsx` render the amber "🚧 SMS Marketing is currently pending carrier approval. Will be unlocked very soon." banner.
- `SENDING_LOCKED` is already hardcoded `false` in both files, so the lock branches are dead code.
- `send-mass-sms/index.ts` already reads `TWILIO_API_KEY`, `TWILIO_FROM_NUMBER`, and `LOVABLE_API_KEY` and returns a 500 for each missing one — but it returns them without a `console.error`, so a misconfiguration is invisible in function logs.
- **Mobile gap:** the personal dashboard's SMS `TabsTrigger` sits inside a `hidden md:grid` list. `MobileBottomNav`'s `PRIMARY_TABS` (Links, Design, Stats) and `BASE_MORE_TABS` (Shop, Leads, Plan, Cards) contain no `sms` entry, so mobile Solo users cannot open SMS Marketing at all.
- The restaurant dashboard tab strip is `inline-flex min-w-full` horizontally scrollable, so its SMS tab is already reachable on mobile.

## 1. Clean up both SMS marketing tabs
Applies identically to `src/components/personal/SmsMarketingTab.tsx` and `src/components/restaurant/RestaurantSmsMarketingTab.tsx`:

- Delete the pending-carrier-approval banner block.
- Delete the `SENDING_LOCKED` constant and every reference:
  - `disabled={sending || SENDING_LOCKED}` on the `Textarea` becomes `disabled={sending}`.
  - `disabled={SENDING_LOCKED || !canSend}` on the send button becomes `disabled={!canSend}`.
  - Drop the `"Coming Soon"` branch of the button-label ternary, leaving the sending / idle states.
  - Drop the `!SENDING_LOCKED &&` guard on the empty-state paragraph.
- Keep `canSend` exactly as-is: still blocks on `sending`, empty/whitespace message, message over 160 chars, and zero subscribers.

## 2. Visual polish and active copy
- Add a clean green "Live · Carrier Approved" badge above the composer heading, styled with semantic tokens (emerald border/tint, small pill, dot indicator) so it reads correctly in both light and dark mode.
- Update the zero-subscriber empty state:
  - Personal: "Start collecting subscribers when customers tap your TapAway cards!"
  - Restaurant: same action-oriented phrasing, worded for the review hub.

## 3. Make SMS reachable on mobile
- Add an `sms` entry to `BASE_MORE_TABS` in `src/components/personal/MobileBottomNav.tsx`:
  - `{ value: "sms", label: "SMS", icon: MessageSquare, description: "Text your subscribers" }`
  - Import `MessageSquare` from `lucide-react`.
  - Place it next to Leads so the audience tools group together.
- Verify the existing `onTabChange` wiring drives the same `sms` `TabsContent` in `PersonalDashboard.tsx` (it does — the mobile nav and desktop tabs share one `activeTab`), so no dashboard change is needed beyond confirming the tab renders.
- Audit both marketing tabs for small-screen layout: the composer card, subscriber stat, campaign rows, and confirm dialog should stack cleanly at 375px width; adjust padding/wrapping only if the check shows overflow.

## 4. Edge function secret logging
In `supabase/functions/send-mass-sms/index.ts`, keep the existing guards but add an explicit `console.error` before each configuration-failure return (`LOVABLE_API_KEY`, `TWILIO_API_KEY`, `TWILIO_FROM_NUMBER`, and the Supabase env trio) so a missing secret is diagnosable from function logs instead of surfacing only as a generic toast. No behavior change to the send path itself.

## Verification
- Full typecheck.
- Playwright pass on the personal dashboard at mobile viewport (375px): open the More sheet, tap SMS, confirm the tab renders, the pending banner is gone, the Live badge shows, and the composer is interactive.
- Confirm at desktop width that both the personal and restaurant SMS tabs render without the banner and with the send button correctly gated by subscriber count.
- No live text will be sent during verification.

## Technical notes
- All new colors use semantic/emerald Tailwind tokens consistent with the existing dark-mode-aware amber banner pattern being removed — no hardcoded `text-white`/`bg-black`.
- The two marketing tab components remain intentionally near-duplicates (personal vs restaurant data sources); this plan does not refactor them into a shared component, to keep the change surface minimal.