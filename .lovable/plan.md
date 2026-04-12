

# Add "Save My Contact!" Tooltip on Contact Button

## Changes — single file: `src/pages/personal/PersonalProfilePage.tsx`

### 1. Add tooltip state + timer with cleanup
Near the existing state declarations (~line 82-100 area):
```ts
const [showContactTooltip, setShowContactTooltip] = useState(false);
```

Add a `useEffect` that checks `profile.contact_enabled` + `sessionStorage`, starts a 4s auto-dismiss timer, and returns `clearTimeout` cleanup:
```ts
useEffect(() => {
  if (!profile?.contact_enabled) return;
  const key = `contact_tooltip_seen_${username}`;
  if (sessionStorage.getItem(key)) return;
  setShowContactTooltip(true);
  const timer = setTimeout(() => {
    setShowContactTooltip(false);
    sessionStorage.setItem(key, 'true');
  }, 4000);
  return () => clearTimeout(timer);
}, [profile?.contact_enabled, username]);
```

### 2. Dismiss on contact button click
Inside `handleSaveContact`, add at the top:
```ts
setShowContactTooltip(false);
sessionStorage.setItem(`contact_tooltip_seen_${username}`, 'true');
```

### 3. Render tooltip next to each contact button (banner + non-banner)
After each `<button>` for save contact (lines ~1213 and ~1254), add:
```tsx
{showContactTooltip && (
  <div
    className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap
      bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg
      animate-fade-in pointer-events-none"
    style={{ animationDuration: '0.3s' }}
  >
    Save my contact!
    {/* Right-pointing arrow */}
    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2
      w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px]
      border-b-transparent border-l-[6px] border-l-white" />
  </div>
)}
```

The tooltip is positioned to the **left** of the button (expands leftward via `right-12`) with a right-pointing CSS triangle arrow. `whitespace-nowrap` prevents text wrapping. The parent button container already has `relative` positioning via the flex wrapper — we'll wrap each contact button in a `relative` span so the tooltip anchors correctly without affecting layout.

### Key safety checks
- **No mobile overflow**: tooltip expands left, not right; `whitespace-nowrap` keeps it compact
- **Timer cleanup**: `useEffect` returns `clearTimeout`
- **Dismiss on action**: `handleSaveContact` immediately hides tooltip + sets sessionStorage

## Files Modified

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Add tooltip state, useEffect timer, dismiss logic, tooltip JSX at both button locations |

