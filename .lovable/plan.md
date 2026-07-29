
# Fix A2P 10DLC Error 30913 — Unbundle Marketing vs Transactional SMS Consent

Twilio rejected our campaign because our single checkbox bundles marketing (promos, discounts, loyalty rewards) with review reminders/service notifications. Carriers require each campaign to have its own unchecked-by-default opt-in with its own disclosures. We'll split the copy, the checkbox, the audit trail, and the subscriber columns.

## 1. Database migration

Add dual-consent tracking columns (defaults `false`, backfills existing rows safely):

```sql
ALTER TABLE public.personal_email_captures
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in_at timestamptz;

ALTER TABLE public.restaurant_sms_subscribers
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_transactional_opt_in_at timestamptz;

ALTER TABLE public.sms_signup_submissions
  ADD COLUMN IF NOT EXISTS marketing_consent_text text,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS transactional_consent_text text,
  ADD COLUMN IF NOT EXISTS transactional_consent_at timestamptz;
```

Existing legacy `sms_opt_in` / `consent_text` columns stay in place for backward compat — new writes populate both old and new fields (marketing wins for the legacy field when both are checked).

## 2. `src/lib/smsConsent.ts` — split consent copy

Replace the single `SMS_CONSENT_TEXT` with two campaign-scoped constants, each with full disclosures (brand, "Msg & data rates may apply", "Msg frequency varies", STOP/HELP):

- `SMS_MARKETING_CONSENT_TEXT` — marketing/promos/discounts/loyalty from TapAway + participating merchants.
- `SMS_TRANSACTIONAL_CONSENT_TEXT` — review reminders and service notifications from TapAway + participating merchants.

Keep `SMS_CONSENT_TEXT` exported as a legacy alias pointing to `SMS_MARKETING_CONSENT_TEXT`.

## 3. `src/components/compliance/SmsConsentBlock.tsx` — dual checkbox

Rework the component API:

```ts
interface Props {
  marketingChecked: boolean;
  onMarketingChange: (v: boolean) => void;
  transactionalChecked: boolean;
  onTransactionalChange: (v: boolean) => void;
  requireMarketing?: boolean;
  requireTransactional?: boolean;
  compact?: boolean;
}
```

Render TWO independent unchecked-by-default checkboxes, each with its own consent paragraph directly beside it. Privacy + Terms links appear once, below both blocks. No shared state — ticking one does NOT tick the other.

## 4. Forms + audit trail

**`src/components/personal/SmsOptInDrawer.tsx`** and **`src/components/restaurant/RestaurantSmsOptInDrawer.tsx`**
- Track two independent state flags (`marketingConsent`, `transactionalConsent`).
- VIP list is a marketing campaign → require `marketingConsent` to submit; `transactionalConsent` is optional additive.
- On insert into `personal_email_captures` / `restaurant_sms_subscribers`, populate the four new columns plus the legacy `sms_opt_in` (true if either box is checked).
- On insert into `sms_signup_submissions`, populate `marketing_consent_text` + `marketing_consent_at` and/or `transactional_consent_text` + `transactional_consent_at` based on which boxes the user ticked. Mirror the winning text into legacy `consent_text` for continuity.

**`src/pages/SmsSignup.tsx`** (the TCR reviewer-facing proof page)
- Render both checkboxes side-by-side using the new component.
- Add explainer copy that names the two campaigns distinctly ("VIP Marketing Texts" vs "Review Reminders & Service Notifications"), each showing its own frequency + rates + STOP/HELP disclosure.
- Log submissions to `sms_signup_submissions` per the rule above.

Any other place that imports `SmsConsentBlock` gets updated to the new dual-prop API.

## 5. Legal pages

**`src/pages/Privacy.tsx`** and **`src/pages/Terms.tsx`**
- Add short paragraphs describing the two independent SMS programs.
- State plainly: opting into one program does NOT opt you into the other, consent is not required for any purchase, and mobile info + opt-in consent are never shared/sold to third parties for marketing (CTIA requirement).

## 6. Verify

Run `tsgo` (project typecheck) after edits. Fix any callsite of the old `SmsConsentBlock` API surfaced by the check.

## Out of scope
- Twilio campaign resubmission itself — done in the Twilio console after this ships.
- Splitting sender-side logic into two Twilio campaigns (transactional sender not built yet); this plan only captures the split at opt-in so we have the data when we build it.
