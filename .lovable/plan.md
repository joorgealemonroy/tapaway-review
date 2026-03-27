

# Remove Setup Checklist Widget

The floating setup checklist (showing 25%/75% progress ring) is no longer needed for the business-focused flow.

## Changes

### `src/pages/personal/PersonalDashboard.tsx`
- Remove the `import { SetupChecklist }` line
- Remove the `<SetupChecklist ... />` render block (~line 824-832)

### `src/components/personal/SetupChecklist.tsx`
- Delete the file entirely

