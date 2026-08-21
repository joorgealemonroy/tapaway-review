# SMS VIP block: optional description + button-only style

Two changes to the "SMS VIP List" block so it can be as minimal as a single tap button.

## What changes

1. **Description can be blank**
   Today, leaving Description empty silently falls back to "Get exclusive updates and offers via text." on the live hub. After this change, a blank description saves as blank and renders nothing — no empty gap, no default text.

2. **New "Button only" style**
   A style toggle at the top of the SMS block editor with two options:
   - **Card** (current look): headline + description inside a bordered card, with the button below.
   - **Button only**: just a single full-width action button (uses the Button Text), no card, no headline, no description. Tapping it opens the same VIP sign-up drawer.

   When "Button only" is selected, the Headline and Description fields are hidden in the editor. Headline stays optional in Card style too — if blank, only the description and button show.

## Technical notes

- `src/components/personal/BlockModal.tsx`
  - Add `smsStyle` state (`"card" | "button"`), loaded from `content.style` (default `"card"`).
  - Save `style` in the block content; stop substituting default text for `description` (and `headline`) — persist trimmed values, empty string allowed. `buttonText` keeps its default fallback since it is the only required label.
  - Editor: style segmented control; hide Headline/Description inputs when style is `button`.
- `src/pages/personal/PersonalProfilePage.tsx` (`case "sms_subscribe"`)
  - Read `style`; when `button`, render the standalone button (same styling as other action blocks) that opens `SmsOptInDrawer`.
  - In card style, render headline/description only when non-empty; treat missing keys as the current defaults so existing blocks are unchanged.
  - Pass the resolved headline/description to `SmsOptInDrawer`, using the built-in defaults there when blank so the drawer still reads well.
- `src/components/personal/ProfilePreviewRenderer.tsx`
  - Mirror the same style/blank handling so the dashboard preview matches the live hub.

## Backward compatibility

Existing blocks have no `style` key and their saved description text is intact, so they continue rendering exactly as they do now.
