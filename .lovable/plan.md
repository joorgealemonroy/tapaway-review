
# Plan: Replace Modal Tutorial with Inline Walkthrough

## Overview

Replace the current `WelcomeTutorialModal` (a dialog box with "Next" buttons) with inline coach marks/tooltips that appear directly on the dashboard elements. This creates a "follow-through" experience where users see tips attached to the actual UI elements they'll be using.

---

## Design Approach

### New Component: `WelcomeCoachMarks.tsx`

Instead of a modal, create a lightweight coach mark system that:
- Shows small tooltip-style callouts attached to specific dashboard elements
- Auto-advances through steps as user interacts with the UI OR via a "Got it" button
- Uses Framer Motion for smooth fade/slide animations
- Dismisses permanently via localStorage

### Steps (Simplified)

| Step | Target Element | Message |
|------|----------------|---------|
| 1 | Profile Header (name/photo) | "Welcome! This is your TapAway profile. Tap your photo to change it." |
| 2 | Links Tab | "Add links to your social profiles, website, and more." |
| 3 | Design Tab | "Customize colors, headers, and make it yours." |
| 4 | Profile URL | "Share this link anywhere — or request a TapAway card!" |

**Note:** The "Confirm Your Card" step is removed. Instead, a brief mention of requesting a card is included in the final step.

---

## Implementation

### 1. Create `WelcomeCoachMarks.tsx`

```tsx
// New component that renders floating tooltips attached to dashboard elements
interface CoachMarkStep {
  id: string;
  targetId: string; // ID of the DOM element to attach to
  title: string;
  message: string;
  position: "top" | "bottom" | "left" | "right";
}

const COACH_STEPS: CoachMarkStep[] = [
  {
    id: "welcome",
    targetId: "profile-header",
    title: "Welcome to TapAway!",
    message: "This is your digital profile. Tap your photo to customize it.",
    position: "bottom",
  },
  {
    id: "links",
    targetId: "tab-links",
    title: "Add Your Links",
    message: "Connect social profiles, websites, and anything you want to share.",
    position: "bottom",
  },
  {
    id: "design",
    targetId: "tab-design",
    title: "Customize Your Look",
    message: "Choose colors and upload a header image to match your style.",
    position: "bottom",
  },
  {
    id: "share",
    targetId: "profile-url",
    title: "You're All Set!",
    message: "Share your link anywhere. Want a physical card? Check the Card tab!",
    position: "top",
  },
];
```

The coach mark will:
- Render a floating div positioned relative to the target element
- Show one step at a time with "Got it" / "Skip" buttons
- Track current step in component state
- Dismiss permanently on completion or skip

### 2. Add Target IDs to Dashboard Elements

Add `id` attributes to key dashboard elements so coach marks can attach:

```tsx
// Profile header section
<div id="profile-header" className="flex items-center gap-4 mb-6">

// Tab triggers
<TabsTrigger id="tab-links" value="links" ...>
<TabsTrigger id="tab-design" value="design" ...>

// Profile URL button
<button id="profile-url" onClick={copyProfileUrl} ...>
```

### 3. Update PersonalDashboard.tsx

- Remove `WelcomeTutorialModal` component usage
- Add `WelcomeCoachMarks` component with the same trigger logic (welcome=true param)
- Pass necessary props for positioning and dismissal

### 4. Delete WelcomeTutorialModal.tsx

Remove the old modal component since it's no longer needed.

---

## Visual Design

```
┌─────────────────────────────────────────┐
│  TapAway              [Switch] [Logout] │
├─────────────────────────────────────────┤
│                                         │
│  [Photo] John Doe                       │
│          tapaway.co/john ◄─────────┐    │
│                               ┌────┴───────────┐
│  ┌─────────────────────────┐  │ You're All Set! │
│  │ Links │ Design │ Stats │  │ Share your link │
│  └─────────────────────────┘  │ anywhere. Want a│
│                               │ card? Check the │
│  ...content...                │ Card tab!       │
│                               │ [Got it!]       │
│                               └─────────────────┘
```

The coach mark appears as a floating card with:
- Title in bold
- Short message (1-2 sentences)
- "Got it" button to advance
- "Skip tutorial" link to dismiss entirely

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/personal/WelcomeCoachMarks.tsx` | **Create** | New inline coach mark component |
| `src/components/personal/WelcomeTutorialModal.tsx` | **Delete** | Remove old modal component |
| `src/pages/personal/PersonalDashboard.tsx` | **Modify** | Add element IDs, replace modal with coach marks |

---

## Technical Details

### Coach Mark Positioning

Use a portal + `getBoundingClientRect()` to position the tooltip relative to target elements:

```tsx
const CoachMark = ({ step, onNext, onSkip }: Props) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    const target = document.getElementById(step.targetId);
    if (target) {
      const rect = target.getBoundingClientRect();
      // Calculate position based on step.position (top/bottom/left/right)
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [step]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed z-[100] bg-background border shadow-lg rounded-lg p-4 max-w-xs"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
    >
      <h4 className="font-semibold text-sm">{step.title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
      <div className="flex items-center justify-between mt-3">
        <button onClick={onSkip} className="text-xs text-muted-foreground">
          Skip
        </button>
        <Button size="sm" onClick={onNext}>Got it</Button>
      </div>
    </motion.div>,
    document.body
  );
};
```

### Smooth Tab Highlighting

When showing the "Links" or "Design" tab coach marks, add a subtle pulse/highlight to the tab:

```tsx
// Add pulsing ring around target when coach mark is active
<TabsTrigger 
  id="tab-links" 
  value="links" 
  className={cn(
    "...",
    activeCoachStep === "links" && "ring-2 ring-primary ring-offset-2 animate-pulse"
  )}
>
```

---

## Behavior

1. User lands on dashboard with `?welcome=true` → Coach marks start
2. Step 1: Tooltip appears under profile header
3. User taps "Got it" → Step 2: Tooltip moves to Links tab
4. User taps "Got it" → Step 3: Tooltip moves to Design tab
5. User taps "Got it" → Step 4: Tooltip appears on profile URL, mentions card option
6. User taps "Got it!" → Tutorial complete, saved to localStorage
7. "Skip" at any point → Dismiss entire tutorial

---

## Key Differences from Old Tutorial

| Old (Modal) | New (Coach Marks) |
|-------------|-------------------|
| Separate dialog box | Inline tooltips on actual UI |
| "Next" buttons in modal | "Got it" on floating tips |
| "Confirm Your Card" step | Just mentions "request a card" |
| Blocks interaction | Non-blocking, can click around |
| Generic icons | Points to real elements |

