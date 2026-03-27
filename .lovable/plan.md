

# Make Lead Capture Form Collapsible & Allow More Fields

## Changes

### `src/components/personal/LeadFormBuilder.tsx`
1. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` and `ChevronDown`
2. Wrap the entire form content (everything below the header) in a `Collapsible` defaulting to closed
3. Make the header row ("Lead Capture Form" + subtitle) the `CollapsibleTrigger` with a rotating chevron icon
4. Keep the `Switch` toggle outside the collapsible trigger click area (use `stopPropagation`)
5. Increase the max fields limit from 8 to 20 (line where `fields.length < 8` is checked)

