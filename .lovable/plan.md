

# Fix Tooltip Position, Duration & Z-Index

## Changes — `src/pages/personal/PersonalProfilePage.tsx`

### 1. Increase timeout from 4s → 6s (line 970)
Change `4000` to `6000`.

### 2. Reposition both tooltips below the button with z-50
Replace the tooltip div at **line 1239** and **line 1291** (identical change both times):

**From:**
```
absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap ... animate-fade-in pointer-events-none
```
with right-pointing arrow

**To:**
```
absolute z-50 right-0 top-full mt-2 whitespace-nowrap ... animate-fade-in pointer-events-none
```
with up-pointing arrow (`border-b-white` at `top-[-6px] right-3`)

### 3. Replace the arrow CSS triangles
At both locations, change the arrow from right-pointing to up-pointing:
```tsx
<div className="absolute top-[-6px] right-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white" />
```

## Summary of all edits

| Line | Change |
|------|--------|
| 970 | `4000` → `6000` |
| 1239 | Reposition tooltip below button + add `z-50` |
| 1243 | Replace right-pointing arrow with up-pointing arrow |
| 1291 | Reposition tooltip below button + add `z-50` |
| 1295 | Replace right-pointing arrow with up-pointing arrow |

Single file: `src/pages/personal/PersonalProfilePage.tsx`

