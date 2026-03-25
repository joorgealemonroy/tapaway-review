

# Add Leads Tab to Admin Personal Accounts

## Overview

Add a "Leads" tab to the admin edit modal for personal accounts so admins can view the lead form configuration and all submissions for any account.

## Changes

### `src/pages/admin/AdminPersonalAccounts.tsx`

**Edit modal tabs** (~line 1641): Expand from 3-column to 4-column grid and add a "Leads" tab:

```tsx
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="basic">Basic Info</TabsTrigger>
  <TabsTrigger value="design">Design</TabsTrigger>
  <TabsTrigger value="content">Content</TabsTrigger>
  <TabsTrigger value="leads">Leads</TabsTrigger>
</TabsList>
```

**New TabsContent for "leads"**: Render `<EmailLeadsTab profileId={editingAccount.id} />` which already contains the LeadFormBuilder + submissions inbox. This component is fully self-contained — it fetches lead forms and submissions by `profileId`.

**Import**: Add `EmailLeadsTab` import at the top.

**Also apply the same change to the create modal tabs** (~line 1302) if desired, though leads are only relevant for existing accounts — so only the edit modal needs this tab.

### Files

| File | Change |
|------|--------|
| `src/pages/admin/AdminPersonalAccounts.tsx` | Add "Leads" tab to edit modal, import EmailLeadsTab |

No database or RLS changes needed — admin already has full access via the `super_admin` RLS policies.

