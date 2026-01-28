
# Plan: Fix Welcome Tutorial Not Showing After Password Setup

## Problem

The welcome tutorial (coach marks) doesn't appear after users complete their password setup via the magic link flow, despite being redirected to `/personal/dashboard?welcome=true`.

## Root Cause Analysis

There's a **race condition** in the `PersonalDashboard.tsx` welcome tutorial logic:

```tsx
// Lines 203-215
useEffect(() => {
  const isWelcome = searchParams.get("welcome") === "true";
  if (isWelcome && profile) {  // <-- PROBLEM: Both must be true at the same time
    // ... show tutorial
    setSearchParams({});  // <-- Clears URL immediately
  }
}, [profile, searchParams, setSearchParams]);
```

**What happens:**
1. User navigates to `/personal/dashboard?welcome=true`
2. Effect runs while `profile` is still `null` (loading)
3. Condition `isWelcome && profile` fails because profile is null
4. Profile loads, effect runs again - but now URL params may be in a different state or cleared by another effect

## Solution

Use a **ref to capture the welcome param on mount**, then check it once profile loads:

### Changes to PersonalDashboard.tsx

**1. Add a ref to capture the initial welcome param:**

```tsx
const welcomeParamRef = useRef<boolean>(false);

// Capture the welcome param ONCE on mount (before profile loads)
useEffect(() => {
  if (searchParams.get("welcome") === "true") {
    welcomeParamRef.current = true;
    // Clear the URL param immediately to prevent refresh issues
    setSearchParams({}, { replace: true });
  }
}, []); // Empty deps - runs once on mount
```

**2. Update the welcome tutorial effect to use the ref:**

```tsx
// Show welcome tutorial after profile loads if we had the welcome param
useEffect(() => {
  if (welcomeParamRef.current && profile) {
    const dismissKey = `tapaway_personal_welcome_dismissed_${profile.id}`;
    const alreadyDismissed = localStorage.getItem(dismissKey);
    
    if (!alreadyDismissed) {
      setShowWelcomeTutorial(true);
    }
    // Reset ref so it doesn't trigger again
    welcomeParamRef.current = false;
  }
}, [profile]); // Only depends on profile
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/personal/PersonalDashboard.tsx` | Fix race condition with useRef pattern |

---

## Technical Implementation

```tsx
// Line ~122 - Add the ref
const welcomeParamRef = useRef<boolean>(false);

// Line ~198 - Add new effect to capture param on mount
useEffect(() => {
  if (searchParams.get("welcome") === "true") {
    welcomeParamRef.current = true;
    setSearchParams({}, { replace: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Intentionally empty - run once on mount

// Lines 203-215 - Replace existing welcome effect
useEffect(() => {
  if (welcomeParamRef.current && profile) {
    const dismissKey = `tapaway_personal_welcome_dismissed_${profile.id}`;
    const alreadyDismissed = localStorage.getItem(dismissKey);
    
    if (!alreadyDismissed) {
      setShowWelcomeTutorial(true);
    }
    welcomeParamRef.current = false;
  }
}, [profile]);
```

---

## Expected Behavior After Fix

1. User completes password setup via magic link
2. Redirected to `/personal/dashboard?welcome=true`
3. On mount, the `welcome=true` param is captured in the ref and URL is cleared
4. Once profile loads, the tutorial starts automatically
5. Tutorial coach marks appear pointing to actual UI elements
6. Completing/skipping tutorial saves dismissal to localStorage
