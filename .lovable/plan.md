

# Replace Logo with Back Button on /import

## Changes

### File: `src/pages/personal/ImportProfile.tsx`

**Header update (lines 252–261):**
- Remove the `<img>` logo element
- Replace with a back button using `ArrowLeft` from lucide-react (already importing other lucide icons) that navigates back via `navigate(-1)`
- Keep the "Start Fresh →" link on the right

```tsx
// Before
<img src="/tapaway-logo.svg" alt="TapAway" className="h-6" />

// After
<button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
  <ArrowLeft className="w-4 h-4" />
  Back
</button>
```

- Add `ArrowLeft` to the lucide-react import on line 4

## Files Modified
- `src/pages/personal/ImportProfile.tsx`

