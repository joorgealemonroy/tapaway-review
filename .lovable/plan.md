

# Fix: Black Screen on Safari When Tapping NFC Card

## Root Cause

The profile for `adrianlasislas` has a radial gradient background:
```
radial-gradient(ellipse at top, rgb(21, 21, 21) 0%, rgb(11, 11, 11) 40%, #0a0a0a 100%)
```

On line 825-827 of `PersonalProfilePage.tsx`, gradient backgrounds get `backgroundAttachment: 'fixed'`:
```js
const bgStyle = isGradientBg 
  ? { background: bgColor, backgroundAttachment: 'fixed' as const } 
  : { backgroundColor: bgColor };
```

**`background-attachment: fixed` is broken on iOS Safari.** It's a long-standing WebKit bug — the browser either doesn't render the gradient at all or collapses it to nothing. The result: the user sees only the outer wrapper's solid black `backgroundColor` with no content contrast, making it look like an all-black screen.

Additionally, the profile uses `header_type: "banner"` with a profile photo as the banner image. If that image hasn't loaded yet on a cold Safari tap, the entire viewport is black gradient + unloaded image = all black.

## Fix

### 1. `src/pages/personal/PersonalProfilePage.tsx` — Remove `backgroundAttachment: 'fixed'`

The "parallax" effect this was meant to create doesn't work on mobile Safari anyway. Remove it entirely:

```js
const bgStyle = isGradientBg 
  ? { background: bgColor } 
  : { backgroundColor: bgColor };
```

This is a one-line change on line 825-827.

### 2. `src/pages/personal/PersonalProfilePage.tsx` — Match loading skeleton to dark theme

The loading skeleton (line 731-743) uses `bg-background` (white), which flashes white before the dark profile appears. Since the default profile background is now always dark (`#000000` fallback), make the loading skeleton dark too:

```jsx
if (loading) {
  return (
    <div className="min-h-screen bg-black">
      <div className="h-32 bg-white/10 animate-pulse" />
      <div className="max-w-md mx-auto px-4 -mt-16 pb-12">
        <div className="h-28 w-28 rounded-full bg-white/10 animate-pulse border-4 border-black" />
        <div className="mt-4 space-y-2">
          <div className="h-6 w-40 bg-white/10 animate-pulse rounded" />
          <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
```

### 3. `src/pages/UsernameResolver.tsx` — Dark loading spinner

The `MinimalLoader` in UsernameResolver also flashes white. Match it to the dark theme:

```jsx
const MinimalLoader = memo(() => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-white/60" />
  </div>
));
```

## Files Modified
- `src/pages/personal/PersonalProfilePage.tsx` — remove `backgroundAttachment: 'fixed'`, dark loading skeleton
- `src/pages/UsernameResolver.tsx` — dark loading spinner

## Impact
- Fixes the all-black-screen bug on iOS Safari caused by `background-attachment: fixed`
- Eliminates the white flash during loading transitions on dark profiles
- No visual change on desktop browsers (the parallax effect was imperceptible anyway)

