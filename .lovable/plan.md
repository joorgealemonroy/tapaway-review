# A2P 10DLC Compliance & TCR CTA Verification Overhaul

Goal: resolve Twilio 30909 rejection by adding required TCR disclosures to legal pages, publishing a dedicated public `/sms-signup` verification landing page, and adding an unchecked consent checkbox + 4 required disclosures to every phone-number form.

## 1. Privacy Policy (`src/pages/Privacy.tsx`)

Add a new top-level section **"SMS Communications & Mobile Information"** near the top (above the fold in the ToC) containing:

- The exact required clause, verbatim in a highlighted callout:
  > "No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties."
- Bullet list:
  - Users opt in via web forms on TapAway hubs or via keyword (TAPVIP to 978-827-2929).
  - Message frequency varies based on business updates.
  - Message and data rates may apply.
  - Reply STOP to cancel, HELP for assistance.

Route is already public in `App.tsx` at `/privacy` — no routing change needed.

## 2. Terms of Service (`src/pages/Terms.tsx`)

Add a new **"SMS & Mobile Messaging Terms"** section covering:

- TapAway provides SMS loyalty updates, exclusive discounts, and review reminders on behalf of registered small business owners.
- Opt-out: Reply STOP to any message to unsubscribe.
- Support: Reply HELP or contact support@tapaway.co.
- Disclaimer: "Carriers are not liable for delayed or undelivered messages. Message & data rates may apply. Message frequency varies."

Route already public at `/terms`.

## 3. New Public Landing Page `/sms-signup`

Create `src/pages/SmsSignup.tsx` and register the route in `src/App.tsx` (lazy-loaded, above the `/:slug` catch-all). Fully public, no auth.

Sections:
1. **H1:** "TapAway SMS Customer VIP Club Signup"
2. **Business description** paragraph (exact copy from request).
3. **Interactive form** (writes to a new `sms_signup_submissions` table, see technical section):
   - Full Name input
   - Phone Number input (tel, validated)
   - **Unchecked-by-default** checkbox with the exact consent copy from the request rendered inline next to it.
   - Submit button disabled until checkbox is checked and fields valid.
   - Visible inline links to `/privacy` and `/terms` directly below the form.
4. **Keyword opt-in section** below the form:
   - "Alternative Opt-In Method: Text **TAPVIP** to **(978) 827-2929** to join our demo customer VIP list."
5. SEO: title "SMS VIP Club Signup | TapAway", meta description, canonical, and a static `robots` allow (already default). Add `/sms-signup` to `public/sitemap.xml`.

## 4. Audit Existing Phone Forms

Update every form that collects a phone number so it (a) includes an **unchecked** consent checkbox required before submit, and (b) shows the 4 required disclosures + links to `/privacy` and `/terms` directly under the phone field.

Files to update:

- `src/components/personal/SmsOptInDrawer.tsx` — add unchecked checkbox, block submit until checked; current disclosure paragraph already has STOP/HELP + frequency/rates and links, so mainly add the checkbox gate.
- `src/components/restaurant/RestaurantSmsOptInDrawer.tsx` — same treatment.
- `src/components/personal/LeadFormSheet.tsx` — when the form contains a `phone` field, render the same unchecked SMS consent checkbox + 4 disclosures + `/privacy` `/terms` links above the submit button; block submit until checked. If no phone field is present, no change.

Reuse a small shared component `src/components/compliance/SmsConsentBlock.tsx` (checkbox + disclosure paragraph + links) to keep copy identical everywhere.

## Technical section

**New page route**
- `src/App.tsx`: `const SmsSignup = lazy(() => import("./pages/SmsSignup"));` and `<Route path="/sms-signup" element={<SmsSignup />} />` placed above the `/:slug` dynamic route.

**Submissions storage**
- New Supabase migration adds `public.sms_signup_submissions` (name, phone, consent_at, consent_text, ip inferred client-side omitted, user_agent, source='/sms-signup'). Follows required 4-step pattern: CREATE TABLE → GRANT `INSERT` to `anon`/`authenticated` and `ALL` to `service_role` (no SELECT to anon) → ENABLE RLS → policies: `INSERT` allowed for `anon`+`authenticated` with `WITH CHECK (true)`; SELECT restricted to `service_role` only (admins can read via existing admin surfaces later if needed). Includes standard `id`, `created_at` defaults.
- Client insert stores the exact consent text string shown to the user for audit.

**Shared consent component**
- `SmsConsentBlock.tsx` exports `{ checked, onChange }` controlled checkbox + fixed disclosure copy + `/privacy` and `/terms` anchor links. Used by all three existing forms and the new page.

**Copy source of truth**
- Consent paragraph string exported as a constant from `src/lib/smsConsent.ts` so the exact wording is identical across forms and stored with each submission.

**Sitemap**
- Append `<url><loc>https://tapaway.co/sms-signup</loc></url>` to `public/sitemap.xml`.

**No changes** to `src/integrations/supabase/client.ts` or auto-generated files.

## Out of scope

- Wiring the Twilio inbound TAPVIP keyword handler (assumed already configured in Twilio console; page only documents the number).
- Changing existing SMS sending logic or Twilio Edge Functions.
- Admin UI to browse `sms_signup_submissions` (can be a follow-up).
