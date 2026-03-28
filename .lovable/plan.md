

# Polish Onboarding UI + Add `has_loss_protection` Column

## UI Changes to `src/pages/Onboarding.tsx`

### 1. Price text color
The `$15` and `$39` prices already use `text-blue-400` (line 317), which is close but not exactly `#3B82F6`. Change to `text-[#3B82F6]` for the exact electric blue.

### 2. Check state on selected card
Already implemented (lines 305-308) — a solid blue circle with white checkmark appears at top-right when selected. The border glow is also already in place (line 301). No changes needed here.

### 3. Animate Continue button from bottom of viewport
Currently the Continue button animates with `y: 20` (subtle). Change it to a **fixed-position bottom bar** that slides up from below the viewport:
- Wrap the Continue button in a `motion.div` with `fixed bottom-0 left-0 right-0` positioning
- Animate from `y: 100` (off-screen below) to `y: 0`
- Add a dark gradient backdrop behind it for readability
- Exit animation slides it back down

### 4. Store plan + protection in database on completion
In the `completeSetup` function, add `plan_type: selectedPlan` and `has_loss_protection: hasProtection` to the restaurant insert/update calls.

## Database Migration

The `restaurants` table already has `plan_type` (string, nullable). Only need to add:

```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS has_loss_protection boolean NOT NULL DEFAULT false;
```

No RLS changes needed — existing restaurant policies cover this column.

## Files Modified
- `src/pages/Onboarding.tsx` — UI polish + store new fields on completion
- New migration — add `has_loss_protection` to `restaurants`

