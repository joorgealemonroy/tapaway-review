# Universal $15 Pricing + 1-Click Claim Page

## 1. Pricing standardization

Single source of truth in `src/lib/constants.ts`:

- Base Software — **$15/mo**
- Card Club add-on — **+$5/mo** (total $20/mo)
- Annual Value Pass — **$180/yr** (Card Club included)

Update every user-facing price to that set and remove legacy $19 / $25 / $29 / $30 / $39 / $49 / $99 / $150 / $199 / $390 copy in:

- `src/components/personal/PersonalBillingTab.tsx` ($150/yr, $30/mo → $180/yr, $15/mo)
- `src/components/personal/ProUpgradeDialog.tsx`, `AdvancedAnalyticsTab.tsx`, `CardsTab.tsx`
- `src/components/landing/FAQSection.tsx` ($30/month), `NewHero.tsx` ($150 first year)
- `src/components/landing/personal/PersonalShopShowcase.tsx`
- `src/pages/Paywall.tsx`, `src/pages/rep/RepDocs.tsx`, `src/pages/rep/RepClose.tsx`, `src/components/rep/PitchScriptDialog.tsx`
- `src/lib/personalPlanLimits.ts`, `src/pages/OnboardingNew.tsx`

Rep commission amounts stay as they are — only customer-facing plan prices change.

## 2. `/claim` landing page

New route `/claim` → `src/pages/ClaimHubPage.tsx`, accepting `?id=<profile_id>` or `?slug=<username>`.

The page is public (no login), so a new `SECURITY DEFINER` function `get_claim_summary(_id uuid, _slug text)` returns only what the page needs: business name, logo, owner name, masked email, trial end date, plus three counts computed server-side:

- Taps → `personal_analytics` rows with `event_type = 'profile_visit'`
- Google review clicks → `personal_analytics` `link_click` rows whose `visitor_info->>'link_url'` points at a Google review URL
- Captured VIP numbers → `personal_email_captures` rows with a non-empty `phone`

Page layout (mobile-first, matches hub aesthetic):

1. Logo + business name header pulled from the profile.
2. Proof-of-value metric row: taps, Google review clicks, captured VIP numbers.
3. Plan selector — Base $15/mo, **Base + Card Club $20/mo (default)**, Annual $180/yr.
4. Single "Claim my hub" button. No fields to fill: name, email and logo come from the record.

## 3. Checkout + activation

New edge function `create-claim-checkout`:

- Validates the profile id, resolves the plan, builds a Stripe subscription Checkout Session with the profile's email pre-filled.
- Adds the Card Club line item when the $20 or annual option is chosen.
- Express wallets (Apple Pay / Google Pay) come from Stripe Checkout's automatic payment methods.
- Success URL: `/claim?id=...&success=true`.

Activation is handled server-side by the existing `stripe-webhook` (extended for `claim` metadata) and confirmed by a `verify-claim-checkout` call on return, which sets `subscription_status = 'active'`, `pipeline_status = 'active'`, `plan_type = 'monthly' | 'yearly'`, `has_card_addon = true` when applicable, and records the conversion against `created_by_rep_id`.

Note on schema: the profile table already has `pipeline_status` and `has_card_addon`, so no new columns are needed — `has_card_addon` is used instead of a new `card_club_active` field.

## 4. Post-checkout welcome

- On `/claim?...&success=true`: full-screen confirmation with "Welcome to TapAway! Your account is fully active." and a button into the dashboard.
- On the dashboard (`src/pages/personal/PersonalDashboard.tsx`): a dismissible welcome card shown once after activation, with action cards **View VIP Subscribers**, **Customize Hub Links**, **Download QR Backup**.

## 5. Rep "Send Claim Link"

- In `src/pages/rep/RepBusinesses.tsx`, trialing hubs get a **Send Claim Link** button that copies (and offers an `sms:` link) the message:
  "Hey [Owner]! Your TapAway card captured [Z] VIP numbers during your trial. Claim your card & keep full access here: https://tapaway.co/claim?id=[profile_id]"
- Trial-ending notification emails/SMS include the same `/claim?id=` URL.

## Verification

- Typecheck clean.
- Load `/claim?id=` for a real trialing hub and confirm stats render and the $20 option is preselected.
- Grep for legacy price strings to confirm none remain.
- Confirm the success state renders the welcome header.
