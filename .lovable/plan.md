

# Fix: Display Style Check Constraint & Vibe Color Sync

## Problem 1: Links Insert Fails with 400
The `personal_links` table has a CHECK constraint allowing only `'pill'`, `'icon'`, `'both'`. But vibe templates set `displayStyle: "grid"` for half-width links (Instagram/TikTok in Obsidian, Bloom, etc.). This value passes through to the DB insert and violates the constraint.

**Fix**: Migration to add `'grid'` to the allowed values:
```sql
ALTER TABLE personal_links DROP CONSTRAINT personal_links_display_style_check;
ALTER TABLE personal_links ADD CONSTRAINT personal_links_display_style_check 
  CHECK (display_style = ANY (ARRAY['pill','icon','both','grid']));
```

## Problem 2: Vibe Colors Not Mapped to Profile
The `button_theme` column exists (default `'glass'`) but the signup insert never sets it from the vibe data. The vibe accent color should map to `button_theme`.

**Fix in `CheckoutStep.tsx`**: In all three profile insert locations (~lines 487, 732, 1046), add:
```typescript
button_theme: formData.vibeId 
  ? getVibeTemplate(formData.vibeId)?.mockupTheme.accent || "glass" 
  : "glass",
```

Import `getVibeTemplate` from `@/lib/vibeTemplates`.

## Problem 3: Better Error Logging
**Fix in `CheckoutStep.tsx`** (~line 550): Change `console.warn` to `console.error` with full detail:
```typescript
console.error("Links insert error:", linksError.message, linksError.details, linksError.hint);
```

## Files to Modify

| File | Change |
|------|--------|
| DB migration | Add `'grid'` to `display_style` CHECK constraint |
| `src/components/personal/signup/CheckoutStep.tsx` | Map `button_theme` from vibe accent in all 3 insert paths; improve error logging |

