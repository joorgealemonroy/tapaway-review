
# SMS Marketing Opt-In + Mass Texting

Add visitor SMS opt-in to the contact-capture form, a new dashboard tab to compose mass texts, and a Twilio-backed edge function that sends only to the authenticated owner's opted-in subscribers.

## 1. Database (migration)

The project doesn't have a `captured_leads` table — visitor info from the contact-share block is stored in **`personal_email_captures`** (already has `profile_id`, `email`, `phone`, `name`, `message`). I'll extend that table.

```sql
ALTER TABLE public.personal_email_captures
  ADD COLUMN sms_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN sms_opt_in_at timestamptz;

CREATE INDEX idx_email_captures_sms_opt_in
  ON public.personal_email_captures (profile_id)
  WHERE sms_opt_in = true AND phone IS NOT NULL;
```

Also add an `sms_campaigns` table to log every send (for the dashboard history + audit):

```sql
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own campaigns" ON public.sms_campaigns
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM personal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access campaigns" ON public.sms_campaigns
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- Inserts only via edge function (service role)
```

### RLS verification for `personal_email_captures`

Existing policies are already strict and correct:
- Public anon `INSERT` allowed (visitors must be able to opt in).
- `SELECT` only when `personal_profiles.user_id = auth.uid()` (the profile owner). No cross-tenant leakage. No `UPDATE`/`DELETE` policies → only service role can mutate.

No changes needed beyond adding the column.

## 2. Public profile UI — opt-in checkbox

In `src/pages/personal/PersonalProfilePage.tsx`, the contact-share block (the "Swap Contact"-style form, ~line 440–500) currently submits `name/email/phone/message` to `personal_email_captures`.

Changes inside that block:
- Add `smsOptIn` state (default `false`).
- Render a small muted checkbox **only when a phone number was entered** (otherwise SMS opt-in is meaningless). Label: *"Send me exclusive updates and offers via text message."* (text-xs, muted color, with a tiny "Msg & data rates may apply. Reply STOP to opt out." helper line — required for TCPA compliance).
- Include `sms_opt_in: smsOptIn && !!phoneInput.trim()` and `sms_opt_in_at: smsOptIn ? new Date().toISOString() : null` in the insert.

## 3. Dashboard — "SMS Marketing" tab

In `src/pages/personal/PersonalDashboard.tsx` (existing tabs: links, design, leads, analytics, shop, plan, cards), add a new tab **`sms`** with `MessageSquare` icon, label "SMS".

New component `src/components/personal/SmsMarketingTab.tsx`:

- **Audience card** — counts via `supabase.from('personal_email_captures').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).eq('sms_opt_in', true).not('phone','is',null)`. Shows "Total SMS Subscribers".
- **Composer** — `<Textarea maxLength={160}>` + live counter `{message.length}/160`. Disabled when 0 subscribers or empty.
- **Send button** — "Send Mass Text". On click: confirm dialog ("Send to N subscribers?") → invoke edge function → success toast → refresh recent campaigns list.
- **Recent campaigns** — small list reading `sms_campaigns` (last 10) showing date, snippet, recipient count, success/failure counts.

## 4. Backend — Twilio edge function

**Provider:** Twilio via the existing standard connector + gateway (LOVABLE_API_KEY + TWILIO_API_KEY pattern). Twilio is not yet connected in this workspace — I'll prompt to connect it before deploying. Required: a Twilio phone number stored as a secret `TWILIO_FROM_NUMBER`.

New function `supabase/functions/send-mass-sms/index.ts`:

1. CORS preflight.
2. Validate JWT — `supabase.auth.getUser(authHeader)` using anon client. Reject if not authenticated.
3. Parse + zod-validate body: `{ profile_id: uuid, message: string (1–160) }`.
4. **Ownership check** — using service-role client, verify `personal_profiles.id = profile_id AND user_id = <authenticated user id>`. Reject 403 otherwise. (Belt-and-suspenders on top of RLS.)
5. Query recipients with **explicit owner scoping**:
   ```ts
   supabaseAdmin.from('personal_email_captures')
     .select('phone')
     .eq('profile_id', profile_id)        // already verified to belong to caller
     .eq('sms_opt_in', true)
     .not('phone', 'is', null);
   ```
6. Insert a `sms_campaigns` row with `profile_id`, `user_id`, `message`, `recipient_count`.
7. Loop with small concurrency (e.g. batches of 10) → POST to Twilio gateway `/Messages.json` with `To`, `From=TWILIO_FROM_NUMBER`, `Body=message + "\nReply STOP to opt out."`.
8. Tally success/failure → update the campaign row.
9. Return `{ recipient_count, success_count, failure_count }`.

`supabase/config.toml` block: `verify_jwt = false` (we validate in code; matches project pattern).

### Required secrets / setup before deploying
- Connect **Twilio** standard connector (will set `TWILIO_API_KEY`).
- Add `TWILIO_FROM_NUMBER` secret (E.164, e.g. `+15551234567`).
- Recommend the user enable Twilio SMS Pumping Protection + Geo Permissions in their Twilio console.

## Files

**Create**
- `supabase/migrations/<ts>_sms_opt_in.sql`
- `src/components/personal/SmsMarketingTab.tsx`
- `supabase/functions/send-mass-sms/index.ts`

**Edit**
- `src/pages/personal/PersonalProfilePage.tsx` — checkbox + insert payload.
- `src/pages/personal/PersonalDashboard.tsx` — add `sms` tab + content.
- `supabase/config.toml` — function block for `send-mass-sms`.

## Security recap
- RLS on `personal_email_captures` already restricts SELECT to the owning profile's `user_id`. No client-side query can read another owner's phones.
- `sms_campaigns` mirrors the same pattern.
- Edge function does **two** scoping checks (ownership of `profile_id`, then `.eq('profile_id', profile_id)` on recipients) and uses the JWT-derived `user.id`, never trusting client-supplied IDs without verification.
- TCPA helper text + auto-appended "Reply STOP to opt out." on outbound messages.

## Confirm before I build
1. OK to extend `personal_email_captures` (rather than introduce a new `captured_leads` table)?
2. OK to use **Twilio** (I'll trigger the connect flow) — or a different provider?
