
# Plan: Make Tutorial Coach Marks Mobile-First

## Problem

On mobile, the "You're All Set!" tooltip is cut off at the top of the screen. The tooltip is positioned above the target element (`position: "top"`), but when the target is near the top of the viewport, the tooltip goes off-screen.

Looking at the screenshot, you can see the tooltip title "You're All Set!" is partially hidden because it's positioned above the profile URL element without checking if there's enough vertical space.

---

## Root Cause

In `WelcomeCoachMarks.tsx`, the positioning logic (lines 86-95) doesn't check vertical bounds:

```tsx
if (currentStep.position === "bottom") {
  top = rect.bottom + offset;
  arrowPosition = "top";
} else {
  top = rect.top - tooltipHeight - offset;  // Can be negative!
  arrowPosition = "bottom";
}
```

The horizontal bounds are checked (line 99), but vertical bounds are not.

---

## Solution

1. **Add vertical viewport checking** - If the tooltip would go off-screen at the top, flip it to appear below the target instead
2. **Account for mobile safe areas** - Add padding for the status bar and notch on mobile devices
3. **Ensure minimum top position** - Never position the tooltip above a safe threshold

---

## Changes Required

### File: `src/components/personal/WelcomeCoachMarks.tsx`

**Update the `updatePosition` function to add vertical boundary checking:**

```tsx
const updatePosition = useCallback(() => {
  if (!currentStep) return;

  const target = document.getElementById(currentStep.targetId);
  if (!target) {
    setPosition(null);
    return;
  }

  const rect = target.getBoundingClientRect();
  const tooltipWidth = 280;
  const tooltipHeight = 140; // Slightly larger to account for content
  const offset = 12;
  const safeAreaTop = 60; // Account for mobile status bar/notch

  let top: number;
  let arrowPosition: "top" | "bottom";
  let preferredPosition = currentStep.position;

  // Check if there's enough space above for "top" position
  if (preferredPosition === "top") {
    const spaceAbove = rect.top - safeAreaTop;
    if (spaceAbove < tooltipHeight + offset) {
      // Not enough space above, flip to bottom
      preferredPosition = "bottom";
    }
  }

  // Check if there's enough space below for "bottom" position
  if (preferredPosition === "bottom") {
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < tooltipHeight + offset) {
      // Not enough space below, try top (unless we already tried)
      if (currentStep.position === "bottom") {
        preferredPosition = "top";
      }
    }
  }

  // Calculate final position
  if (preferredPosition === "bottom") {
    top = rect.bottom + offset;
    arrowPosition = "top";
  } else {
    top = rect.top - tooltipHeight - offset;
    arrowPosition = "bottom";
  }

  // Ensure tooltip stays within vertical bounds
  top = Math.max(safeAreaTop, top);
  top = Math.min(top, window.innerHeight - tooltipHeight - 16);

  // Center horizontally on the target, but keep within viewport
  let left = rect.left + rect.width / 2 - tooltipWidth / 2;
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

  setPosition({ top, left, arrowPosition });
}, [currentStep]);
```

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| **Safe area padding** | Add 60px top padding for mobile status bar/notch |
| **Auto-flip logic** | If preferred position doesn't fit, flip to opposite side |
| **Vertical bounds check** | Ensure tooltip never goes above safe area or below viewport |
| **Larger tooltip height estimate** | Increase from 120px to 140px for better spacing |

---

## Expected Result

- On mobile, the "You're All Set!" tooltip will appear **below** the profile URL element instead of above when there isn't enough space
- The tooltip will always be fully visible within the mobile viewport
- Works seamlessly across all device sizes
