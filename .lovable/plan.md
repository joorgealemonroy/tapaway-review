

# Make "Create My Hub" Buttons Bigger for Mobile

## Change

Update all three "Create My Hub" `Button` components in `src/pages/personal/PersonalPricing.tsx` to be taller and use larger text for better mobile tap targets.

### File: `src/pages/personal/PersonalPricing.tsx`

Change the button classes from:
```
className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
```
To:
```
className="w-full h-16 text-lg font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
```

This applies to all three CTA buttons (hero, mid-page, and bottom). The height increases from `h-13` (52px) to `h-16` (64px), and the text goes from `text-base` (16px) to `text-lg` (18px), making the buttons easier to tap on mobile.

