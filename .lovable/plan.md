

# "State Hand-Off" Fix

## Root Cause

The data flow is architecturally correct — `updateLink` mutates the shared `usePersonalOnboarding` hook state, and `formData` in `PersonalSignup` derives from it. However, the localStorage save is **debounced by 1000ms**. If the user clicks "Continue" right after typing, the latest edits may not be persisted to localStorage yet. If any auth redirect (OTP email flow, OAuth) causes a page reload, the in-memory state is lost and localStorage has stale data.

## Fix 1: Flush localStorage before step transition

**`src/pages/personal/PersonalSignup.tsx`** — In the `nextStep` function (~line 366), call `flushSave()` before advancing the step. This guarantees all edits are persisted immediately.

```typescript
const nextStep = () => {
  flushSave(); // <-- immediate localStorage write
  const currentIndex = effectiveSteps.indexOf(currentStep);
  if (currentIndex < effectiveSteps.length - 1) {
    setCurrentStep(effectiveSteps[currentIndex + 1]);
  }
};
```

Also destructure `flushSave` from the hook (it's already returned but not currently used).

## Fix 2: Add debug logging before DB insert

**`src/components/personal/signup/CheckoutStep.tsx`** — Add `console.log` before the links and blocks insert calls (~line 544, ~line 577):

```typescript
console.log("FINAL LINKS PAYLOAD:", linksToInsert);
// ... existing insert call

console.log("FINAL BLOCKS PAYLOAD:", blocksToInsert);
// ... existing insert call
```

## Fix 3: Verify inputs are bound correctly

The PersonalizeStep inputs are already correctly bound — `handleValueChange` calls `updateLink(link.id, { value, url })` which updates the hook's in-memory state. No change needed here.

## Fix 4: Verify CheckoutStep reads from formData (not templates)

CheckoutStep already maps over `formData.links` and `formData.blocks` (lines 520-586), not from VIBE_TEMPLATES. No change needed here — the insert logic is correct.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/personal/PersonalSignup.tsx` | Destructure `flushSave`, call it in `nextStep()` |
| `src/components/personal/signup/CheckoutStep.tsx` | Add console.log debug payloads before insert |

