# Twilio / A2P 10DLC Carrier Compliance

Three small, additive changes — no behavior or design regression. All edits are display-only text or a new static page.

## 1. Privacy Policy — add SMS data-sharing clause

**File:** `src/pages/Privacy.tsx`

Add a new highlighted subsection inside the existing "Information We Collect" / SMS area (or as its own SMS Communications section near the top of the body) containing the **exact** sentence required by carriers:

> "Mobile information will not be shared with third parties/affiliates for marketing/promotional purposes. All other categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties."

Wrap it in a visually distinct block (bordered card with `border-primary/30 bg-primary/5 p-4 rounded-lg`) and label it "SMS / Text Messaging Data" so the carrier reviewer can spot it instantly. Also confirm the footer link in `src/pages/Index.tsx` already labels it "Privacy" — update the visible label to **"Privacy Policy"** to match the carrier requirement exactly.

## 2. CTA disclosure near Submit on every opt-in form

The current footer text on the SMS drawers says *"By joining, you agree to receive recurring marketing text messages. Msg & data rates may apply. Reply STOP to opt out."* — it's missing **"Message frequency varies"** and the wording must be the canonical carrier-required trio.

**Files:**
- `src/components/personal/SmsOptInDrawer.tsx`
- `src/components/restaurant/RestaurantSmsOptInDrawer.tsx`

Replace the existing disclaimer paragraph (rendered just under the Submit button) with:

> By submitting, you agree to receive recurring marketing text messages from TapAway / this business at the number provided. Consent is not a condition of any purchase.
> **Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help.**
> See our [Privacy Policy](/privacy) and [Terms](/terms).

Keep the same `text-xs text-muted-foreground text-center` styling so layout doesn't shift. Bold the three required sentences for reviewer visibility. Privacy / Terms render as `<a>` tags opening in a new tab.

Also audit any other lead/contact forms that capture phone numbers and add the same disclaimer if a phone field is present (e.g. `LeadFormBlock`-style components inside `BlockModal.tsx` and `ProfilePreviewRenderer.tsx` if they include a phone input). For non-marketing phone capture (pure contact lead), only the Privacy Policy link is needed — no SMS disclaimer.

## 3. New `/compliance` Carrier Review page

**New file:** `src/pages/Compliance.tsx`
**Route:** add `<Route path="/compliance" element={<Compliance />} />` in `src/App.tsx` (lazy-loaded, above the `/:slug` catch).

Page contents (single scroll, public, no auth, mobile-friendly):

1. **Header**: "TapAway — SMS Compliance & Opt-In Flow" + brand name, business contact email, last updated date.
2. **Brand & Use Case summary**: short paragraph describing the platform (NFC cards → customer taps → lands on a business profile → can join the business's VIP text list).
3. **Step-by-step opt-in flow with screenshots**:
   - Step 1 — Customer taps NFC card (image of phone tapping a card).
   - Step 2 — Customer lands on the business profile (screenshot of a profile page with "Join VIP Text List" button).
   - Step 3 — Opt-in form drawer with phone field + visible disclaimer (screenshot showing the new disclaimer with all three required phrases highlighted).
   - Step 4 — Confirmation toast / welcome SMS sample.
4. **Sample messages section**: example welcome message, example marketing message, example STOP reply, example HELP reply.
5. **The exact required Privacy sentence** quoted verbatim with a deep link to `/privacy`.
6. **Disclaimer block** quoted verbatim (the same trio used near Submit).
7. **Contact** for carrier reviewers: support@tapaway.co.

**Image assets:** create a `public/compliance/` folder. Initially the page can reference placeholder paths like `/compliance/step-1-tap.png`, `/compliance/step-2-profile.png`, `/compliance/step-3-form.png`, `/compliance/step-4-confirmation.png`. After the page is wired up, you (the user) upload real screenshots to those paths via chat — no code change needed to swap them in.

**Indexing:** add `<meta name="robots" content="noindex,nofollow" />` via `react-helmet-async` so the page exists for the carrier link but doesn't appear in search results. It will remain reachable directly at `tapaway.co/compliance` to paste into the Twilio "Message Flow" field.

## Out of scope / no changes

- Backend, DB, edge functions — none touched.
- `vite.config.ts`, lazy-loading setup — unchanged.
- All existing opt-in form behavior, validation, and submission logic — unchanged; only the static disclaimer text below the button is rewritten.

## Files touched

- `src/pages/Privacy.tsx` (add SMS clause block)
- `src/pages/Index.tsx` (footer label "Privacy" → "Privacy Policy")
- `src/components/personal/SmsOptInDrawer.tsx` (replace disclaimer)
- `src/components/restaurant/RestaurantSmsOptInDrawer.tsx` (replace disclaimer)
- `src/components/personal/BlockModal.tsx` & related lead-form renderers (add disclaimer when phone field present) — only if audit confirms phone capture
- `src/pages/Compliance.tsx` (new)
- `src/App.tsx` (add lazy route)
- `public/compliance/` (placeholder dir for screenshots you'll upload)
