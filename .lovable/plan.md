

# Lead Capture Forms + Email Notifications

## Overview

Build a configurable lead form system with real-time email alerts. Business users create forms in the dashboard, visitors submit via a themed bottom sheet on the public profile, and the business owner gets an instant email notification.

---

## 1. Database Migration

### `lead_forms` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| profile_id | uuid FK → personal_profiles.id | ON DELETE CASCADE |
| is_active | boolean | default true |
| button_title | text | default 'Get a Quote' |
| form_title | text | default 'Request a Quote' |
| fields | jsonb | `[{type, label, required}]` |
| created_at / updated_at | timestamptz | defaults |

### `lead_submissions` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| form_id | uuid FK → lead_forms.id | ON DELETE CASCADE |
| profile_id | uuid FK → personal_profiles.id | ON DELETE CASCADE |
| submission_data | jsonb | key-value responses |
| created_at | timestamptz | default now() |

### RLS
- Owners CRUD their own `lead_forms` (via profile_id → user_id join)
- Public SELECT on active `lead_forms` (needed for profile rendering)
- Public INSERT on `lead_submissions` (visitor submissions)
- Owners SELECT their own `lead_submissions`
- Admins full access on both

---

## 2. New: `src/components/personal/LeadFormBuilder.tsx`

Form builder UI for the Leads tab:
- Toggle to enable/disable form (`is_active`)
- Editable Button Title + Form Title inputs
- Dynamic field list: each row shows type badge (Text/Email/Phone/Long Text), label input, required toggle, delete
- "Add Field" dropdown with 4 field types
- Save button → upsert to `lead_forms`
- One form per profile (enforced by UI)

---

## 3. Update: `src/components/personal/EmailLeadsTab.tsx`

Split into two sections:
- **Top**: `<LeadFormBuilder>` component
- **Middle**: Lead submissions inbox — table showing date + key fields from `submission_data`, expandable rows, CSV export
- **Bottom**: Existing email captures (unchanged)

---

## 4. New: `src/components/personal/LeadFormSheet.tsx`

Public-facing component for `/u/:username`:
- Fetches active `lead_forms` for the profile
- Renders a highlighted CTA pill (uses vibe colors with glow/gradient)
- On tap → Framer Motion bottom sheet (mobile) / modal (desktop) using existing `ResponsiveModal`
- Dynamically renders form fields from the `fields` JSON
- On submit → INSERT into `lead_submissions` → call `notify-new-lead` edge function → success checkmark animation → auto-close 2s
- Themed to match the profile's vibe colors

---

## 5. Update: `src/pages/personal/PersonalProfilePage.tsx`

- Fetch `lead_forms` where `profile_id` matches and `is_active = true`
- Render `<LeadFormSheet>` above regular link pills
- Pass vibe colors for theming

---

## 6. New Edge Function: `supabase/functions/notify-new-lead/index.ts`

Called from the frontend immediately after successful submission INSERT.

**Logic:**
- Accepts `{ profileId, formTitle, submissionData }` in request body
- Queries `personal_profiles` by `profile_id` to get `user_id`
- Queries `auth.users` via the existing `get_auth_user_by_email` RPC (or uses service role to get email from `auth.users` by user_id)
- Sends a formatted HTML email via Resend (same pattern as `send-personal-welcome-emails`):
  - Subject: "New TapAway Lead: [form_title]"
  - Body: Clean card layout with form title, timestamp, and all submitted field key-value pairs rendered as a table
  - Footer: link to their dashboard Leads tab
- Rate limited: 30/hour per profile to prevent abuse
- No JWT required (called after public form submission)

**Frontend trigger** (inside `LeadFormSheet.tsx` after successful INSERT):
```typescript
await supabase.functions.invoke('notify-new-lead', {
  body: { profileId, formTitle, submissionData }
});
```

This is fire-and-forget — the success animation shows regardless of email delivery.

---

## 7. Update: `src/pages/personal/PersonalDashboard.tsx`

Pass `profileId` to the updated `EmailLeadsTab` (already done, just ensure the form builder has access).

---

## Files Summary

| File | Action |
|------|--------|
| **Migration** | Create `lead_forms` + `lead_submissions` tables with RLS |
| **New**: `src/components/personal/LeadFormBuilder.tsx` | Form builder UI |
| **New**: `src/components/personal/LeadFormSheet.tsx` | Public bottom sheet form + CTA pill |
| **New**: `supabase/functions/notify-new-lead/index.ts` | Email notification on new submission |
| `src/components/personal/EmailLeadsTab.tsx` | Integrate builder + submissions inbox |
| `src/pages/personal/PersonalProfilePage.tsx` | Fetch + render lead form CTA |
| `src/pages/personal/PersonalDashboard.tsx` | Pass props to updated Leads tab |
| `supabase/config.toml` | Add `notify-new-lead` with `verify_jwt = false` |

---

## Technical Notes

- Email uses Resend (same as existing welcome emails) — `RESEND_API_KEY` and `EMAIL_FROM` secrets already configured
- Owner email lookup: service role query on `auth.users` joined via `personal_profiles.user_id`
- `fields` JSON schema: `[{ "type": "text"|"email"|"phone"|"textarea", "label": string, "required": boolean }]`
- No new dependencies — Framer Motion, Lucide, ResponsiveModal all in project
- Lead form button uses existing `safeTextColor` contrast logic for readability

