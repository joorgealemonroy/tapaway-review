
# Add Back Button to Email Step + Fix Timing Copy

## Changes

### 1. Back button on the email step
Add a "Back to examples" text link below the "Send Code" button in the email step. Clicking it sets `showOverview = true` and `step = "idle"`, returning the user to the `CardOnboarding` page where they can browse different hubs. The copied layout stays in sessionStorage so picking a new one just replaces it.

### 2. Fix timing copy
Update line 310 from `"Takes 30 seconds"` to `"Around 3 minutes to set up"` -- makes it clear it refers to setup time, not just a vague "3 minutes."

## Technical Details

### File: `src/pages/CardResolver.tsx`

**Line 310** -- Update subtitle:
```
// Before
<p className="text-sm text-muted-foreground">Takes 30 seconds</p>

// After
<p className="text-sm text-muted-foreground">Around 3 minutes to set up</p>
```

**After the "Send Code" button (line 359)** -- Add back link:
```jsx
<button
  onClick={() => { setShowOverview(true); setStep("idle"); }}
  className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
>
  ← Back to examples
</button>
```

No other files need changes.
