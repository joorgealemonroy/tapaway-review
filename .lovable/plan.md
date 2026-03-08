

# Update Cards Button Subheading to "Coming soon"

## Change

In `src/components/personal/MobileBottomNav.tsx`, update the `description` for the "Cards" entry in `BASE_MORE_TABS` from `"Manage your NFC cards"` to `"Coming soon"`.

**File:** `src/components/personal/MobileBottomNav.tsx` (line 25)

```typescript
// Before
{ value: "cards", label: "Cards", icon: CreditCard, description: "Manage your NFC cards" },

// After
{ value: "cards", label: "Cards", icon: CreditCard, description: "Coming soon" },
```

Single-line change, no other files affected.

