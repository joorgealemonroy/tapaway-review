
# Plan: Add Phone Number Collection to Contact Capture Block

## Overview

Update the email capture block to support collecting phone numbers in addition to (or instead of) email addresses. Profile owners can configure which fields to require.

---

## Database Changes

### Add `phone` column to `personal_email_captures` table

```sql
ALTER TABLE public.personal_email_captures
  ADD COLUMN phone text;

-- Make email nullable since users can now choose to collect only phone
ALTER TABLE public.personal_email_captures 
  ALTER COLUMN email DROP NOT NULL;

-- Add a check constraint to ensure at least email OR phone is provided
ALTER TABLE public.personal_email_captures
  ADD CONSTRAINT email_or_phone_required 
  CHECK (email IS NOT NULL OR phone IS NOT NULL);
```

---

## UI Configuration Changes

### BlockModal.tsx - Add Contact Fields Selection

Update the email_capture configuration section to allow choosing which contact method(s) to collect:

| Option | Description |
|--------|-------------|
| `collectEmail` | Collect email address (checkbox, default: true) |
| `collectPhone` | Collect phone number (checkbox, default: false) |

**New UI in the modal:**

```text
┌──────────────────────────────────────┐
│ Configure block                       │
├──────────────────────────────────────┤
│ Headline: [Stay Connected 💌        ]│
│ Description: [Leave your info...    ]│
│ Button Text: [Submit                ]│
├──────────────────────────────────────┤
│ Contact Fields                        │
│                                       │
│ ☑ Collect Email                      │
│ ☐ Collect Phone Number               │
├──────────────────────────────────────┤
│ Optional Fields                       │
│                                       │
│ ☐ Collect Name                       │
│ ☐ Collect Message                    │
└──────────────────────────────────────┘
```

**State changes:**
```typescript
const [collectEmail, setCollectEmail] = useState(true);
const [collectPhone, setCollectPhone] = useState(false);
```

**Content structure:**
```typescript
content = {
  headline: "...",
  description: "...",
  buttonText: "Submit",
  collectEmail: "true",      // NEW
  collectPhone: "false",     // NEW
  collectName: "false",
  collectMessage: "false",
};
```

---

## Form Rendering Changes

### PersonalProfilePage.tsx - Update Email Capture Block

Update the `email_capture` case in the block renderer:

1. Parse `collectEmail` and `collectPhone` from content
2. Conditionally render email input (only if collectEmail is true)
3. Add phone number input (only if collectPhone is true)
4. Validate that at least one contact field is filled before submit
5. Submit phone number to database

**Phone input styling:**
```tsx
<input
  type="tel"
  placeholder="Your phone number"
  value={phoneInput}
  onChange={(e) => setPhoneInput(e.target.value)}
  className={inputClass}
  required={!collectEmail} // Required only if email isn't being collected
/>
```

### ProfilePreviewRenderer.tsx - Update Preview

Mirror the changes for the dashboard preview:
- Show email field placeholder when collectEmail is true
- Show phone field placeholder when collectPhone is true

---

## Leads Display Changes

### EmailLeadsTab.tsx

1. Update interface to include `phone`:
```typescript
interface EmailCapture {
  id: string;
  email: string | null;  // Now nullable
  phone: string | null;  // NEW
  name: string | null;
  message: string | null;
  created_at: string;
}
```

2. Update display to show phone when present:
```tsx
<p className="font-medium text-foreground truncate">
  {lead.email || lead.phone}
</p>
{lead.email && lead.phone && (
  <p className="text-sm text-muted-foreground">{lead.phone}</p>
)}
```

3. Update CSV export to include phone column

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | Add `phone` column, make `email` nullable, add constraint |
| `src/components/personal/BlockModal.tsx` | Add collectEmail/collectPhone toggles |
| `src/pages/personal/PersonalProfilePage.tsx` | Add phone input, update submission logic |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Add phone placeholder in preview |
| `src/components/personal/EmailLeadsTab.tsx` | Display phone, update export |

---

## Backward Compatibility

- Existing blocks with no `collectEmail`/`collectPhone` fields default to `collectEmail: true, collectPhone: false`
- This preserves all existing behavior while unlocking new capabilities
- Existing leads with only email continue to display correctly

---

## Visual Mockup - Public Profile Form

**Email + Phone collection enabled:**
```text
┌────────────────────────────────────┐
│         Stay Connected 💌          │
│   Leave your info and I'll reach   │
│              out!                  │
├────────────────────────────────────┤
│ [Your name (optional)            ] │
│ [your@email.com                  ] │
│ [Your phone number               ] │
│ [Message (optional)              ] │
│ ┌────────────────────────────────┐ │
│ │           Submit               │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Phone only collection:**
```text
┌────────────────────────────────────┐
│         Text Me! 📱               │
│   Drop your number below          │
├────────────────────────────────────┤
│ [Your phone number               ] │
│ ┌────────────────────────────────┐ │
│ │           Submit               │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## Technical Implementation Notes

1. **Phone validation**: Use `type="tel"` for mobile keyboard optimization, but keep validation simple (not empty when required)
2. **Required field logic**: At least one of email OR phone must be filled when submitting
3. **Block label update**: Consider renaming from "Email Capture" to "Contact Capture" in BLOCK_TYPES for clarity
4. **Tab naming**: Consider renaming "Leads" tab icon/label since it now captures more than just emails
