# Slimmer, friendlier VIP text sign-up

The VIP Text List popup currently shows two giant walls of legal text with checkboxes, which fills the whole phone screen and feels cold. Goal: make it short, warm and trustworthy while staying carrier-compliant.

## What changes

**1. Consent becomes compact with expandable details**
- Each opt-in stays a separate, unchecked-by-default checkbox (carrier rule — never merged).
- The checkbox label shrinks to one friendly line each:
  - "Text me deals & VIP perks" — with a short sub-line: "Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel."
  - "Text me review reminders & service updates" — same short sub-line.
- Under each, a small "Full terms" toggle expands the complete A2P consent paragraph. The full wording is still on the page, one tap away, and the exact full text is still what we save to the audit trail — nothing about compliance recordkeeping changes.
- Second checkbox is clearly optional ("optional" tag), first is the required one.

**2. Friendlier, more convincing framing**
- Warmer default copy: headline "Get VIP text perks" with a sub-line like "Be first to know about specials, events and members-only deals."
- Three tiny reassurance chips above the checkboxes: "No spam", "Text STOP anytime", "We never sell your info".
- Submit button gets confident copy and stays disabled until the required box is ticked; a short "Takes 5 seconds" hint under it.
- Hub owners who set their own headline/description keep theirs — the new copy is only the default.

**3. New header icon**
- Drop the generic phone-in-a-circle badge.
- Replace with a small, tasteful mark: a chat-bubble-with-sparkle treatment sized down (compact 36px), or, when the hub has a logo, show the hub logo instead so it feels like the business — not a template.

**4. Height**
- Mobile drawer capped to a comfortable height with internal scroll so the button is always reachable; on desktop the dialog stays compact.

## Technical notes

- `src/components/compliance/SmsConsentBlock.tsx`: rewrite as short label + collapsible full text per campaign; keep two independent checkboxes, `aria-required` behaviour, and the exported consent constants untouched.
- `src/lib/smsConsent.ts`: add short-form label constants; the existing `SMS_MARKETING_CONSENT_TEXT` / `SMS_TRANSACTIONAL_CONSENT_TEXT` stay as the persisted audit strings.
- `src/components/personal/SmsOptInDrawer.tsx` and `src/components/restaurant/RestaurantSmsOptInDrawer.tsx`: new header mark, new default copy, reassurance chips, max-height + scroll on the drawer body. Insert/audit logic unchanged.
- Styling via existing semantic tokens only.
