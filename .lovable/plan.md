

# Add Multiple Choice & Number Field Types to Lead Forms

## Changes

### 1. `src/components/personal/LeadFormBuilder.tsx`

**Update types:**
- Extend `FormField.type` union with `"select" | "number"`
- Add optional `options?: string[]` to `FormField`

**Add to `FIELD_TYPES` array:**
- `{ type: "select", label: "Multiple Choice", icon: ListChecks }`
- `{ type: "number", label: "Number", icon: Hash }`

**Update `fieldTypeBadge`** with `select: "Choice"`, `number: "Number"`

**Update `addField`:** When type is `"select"`, initialize with `options: ["Option 1", "Option 2"]`. When `"number"`, default label `"Quantity"`.

**Add options editor in field row:** When `field.type === "select"`, render a collapsible sub-list below the field row with inline inputs for each option, a trash button per option, and an "Add Option" button (capped at 10).

**Save-time validation in `handleSave`:** Before saving, iterate fields. For any `select` field, filter out empty/whitespace-only options. If 0 options remain, show `toast.error("Multiple choice field needs at least one option")` and abort save.

### 2. `src/components/personal/LeadFormSheet.tsx`

**Update types** to match (add `"select" | "number"`, `options?: string[]`).

**Render new field types:**
- `select` → `RadioGroup` + `RadioGroupItem` from `@/components/ui/radio-group`, one item per option
- `number` → `<Input type="number" inputMode="numeric" />`

**Required validation for select:** In `handleSubmit`, the existing check `!formData[field.label]?.trim()` already covers select fields since an unselected RadioGroup means no value is set. No extra logic needed.

### Files Modified

| File | Change |
|------|--------|
| `src/components/personal/LeadFormBuilder.tsx` | Add select/number types, options editor, save-time validation |
| `src/components/personal/LeadFormSheet.tsx` | Render RadioGroup for select, number input for number fields |

