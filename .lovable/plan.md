

# Plan: Enhance Contact Capture Form with User-Controlled Required/Optional Fields

## Overview

This plan addresses three changes requested for the contact capture block:
1. **Reorder fields**: Phone number should appear above email in the form
2. **User-defined required/optional**: Let the profile owner decide which fields are required vs optional (not hardcoded)
3. **Visual indicators**: Required fields show nothing extra; optional fields show "(optional)" suffix in placeholder

---

## Current Behavior

Currently the form fields are displayed in this order:
1. Name (optional - hardcoded)
2. Email
3. Phone
4. Message (optional - hardcoded)

The system decides required/optional logic:
- Email is required if phone is not collected
- Phone is required if email is not collected
- Name is always labeled "(optional)"
- Message is always labeled "(optional)"

---

## Solution

### 1. Add New State Variables for Required/Optional Toggle

In `BlockModal.tsx`, add new state for each field's required status:

```typescript
// New required toggles (default true for contact fields, false for name/message)
const [emailRequired, setEmailRequired] = useState(true);
const [phoneRequired, setPhoneRequired] = useState(true);
const [nameRequired, setNameRequired] = useState(false);
const [messageRequired, setMessageRequired] = useState(false);
```

### 2. Update Content Structure

Store the required settings in the block content:

```typescript
content = {
  headline: "...",
  description: "...",
  buttonText: "Submit",
  collectEmail: "true",
  collectPhone: "true",
  collectName: "false",
  collectMessage: "false",
  // NEW fields:
  emailRequired: "true",
  phoneRequired: "true",
  nameRequired: "false",
  messageRequired: "false",
};
```

### 3. Update BlockModal UI Configuration

Under each "Collect X" toggle, add a "Required" sub-toggle that only appears when the field is enabled:

**New UI structure:**
```text
┌──────────────────────────────────────┐
│ Contact Fields                        │
├──────────────────────────────────────┤
│ ☑ Collect Phone       [Required ☑]  │
│ ☑ Collect Email       [Required ☑]  │
├──────────────────────────────────────┤
│ Additional Fields                     │
├──────────────────────────────────────┤
│ ☑ Collect Name        [Required ☐]  │
│ ☐ Collect Message     [Required ☐]  │
└──────────────────────────────────────┘
```

### 4. Reorder Form Fields (Phone Above Email)

In `PersonalProfilePage.tsx` and `ProfilePreviewRenderer.tsx`, change the render order:

**Current order:**
1. Name
2. Email
3. Phone
4. Message

**New order:**
1. Name
2. Phone ← moved up
3. Email ← moved down
4. Message

### 5. Update Placeholders with "(optional)" Suffix

In the form rendering, dynamically set placeholder text based on required status:

```typescript
// Phone input
placeholder={phoneRequired ? "Your phone number" : "Your phone number (optional)"}
required={phoneRequired}

// Email input  
placeholder={emailRequired ? "your@email.com" : "your@email.com (optional)"}
required={emailRequired}

// Name input
placeholder={nameRequired ? "Your name" : "Your name (optional)"}
required={nameRequired}

// Message input
placeholder={messageRequired ? "Message" : "Message (optional)"}
required={messageRequired}
```

### 6. Update Form Validation

Remove the auto-required logic that makes email/phone required based on the other. Instead, respect the user's explicit required settings:

```typescript
// Current (REMOVE this logic):
required={!showPhone}  // Email required only if phone not shown
required={!showEmail}  // Phone required only if email not shown

// New (use explicit settings):
required={emailRequired}
required={phoneRequired}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/personal/BlockModal.tsx` | Add required state variables, update UI to show required toggles, reorder phone/email in save logic, store required settings |
| `src/pages/personal/PersonalProfilePage.tsx` | Reorder phone above email, update placeholders with "(optional)" suffix, use explicit required settings |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Reorder phone above email in preview |

---

## Visual Mockup - Public Form

**Both phone and email required:**
```text
┌────────────────────────────────────┐
│         Stay Connected 💌          │
│   Leave your info...               │
├────────────────────────────────────┤
│ [Your name (optional)            ] │
│ [Your phone number               ] │  ← Phone now first
│ [your@email.com                  ] │  ← Email second
│ [Message (optional)              ] │
│ ┌────────────────────────────────┐ │
│ │           Submit               │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Phone required, email optional:**
```text
┌────────────────────────────────────┐
│         Stay Connected 💌          │
│   Leave your info...               │
├────────────────────────────────────┤
│ [Your phone number               ] │  ← Required, no suffix
│ [your@email.com (optional)       ] │  ← Optional, shows suffix
│ ┌────────────────────────────────┐ │
│ │           Submit               │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## Configuration Modal Mockup

```text
┌──────────────────────────────────────────────────────┐
│ Contact Fields                                        │
├──────────────────────────────────────────────────────┤
│ Collect Phone                                         │
│ Ask for their phone number                   [ON/OFF] │
│   └─ Required                                    [☑] │
│                                                       │
│ Collect Email                                         │
│ Ask for their email address                  [ON/OFF] │
│   └─ Required                                    [☐] │
├──────────────────────────────────────────────────────┤
│ Additional Fields                                     │
├──────────────────────────────────────────────────────┤
│ Collect Name                                          │
│ Ask visitors for their name                  [ON/OFF] │
│   └─ Required                                    [☐] │
│                                                       │
│ Collect Message                                       │
│ Let visitors add a message                   [ON/OFF] │
│   └─ Required                                    [☐] │
└──────────────────────────────────────────────────────┘
```

---

## Backward Compatibility

- Existing blocks without the new `*Required` fields will default to:
  - `emailRequired: true` (if email is being collected)
  - `phoneRequired: true` (if phone is being collected)
  - `nameRequired: false`
  - `messageRequired: false`
- This maintains the current behavior for existing blocks until they're edited

---

## Technical Notes

1. **Field order change**: Phone above email matches the reference screenshot and is more intuitive for mobile users
2. **Validation**: HTML5 `required` attribute handles validation; users who leave required fields blank see browser-native error
3. **No placeholder for required fields**: Required fields show clean placeholders like "Your phone number"; optional fields show "Your phone number (optional)"
4. **Minimum requirement**: At least one of email or phone must be enabled (existing validation stays)

