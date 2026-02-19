

# Replace Card Image with Animated Generic Card

## What Changes

Replace the static TapAway card PNG image with a custom animated SVG/div card element that:

- Is oriented horizontally (landscape / credit card aspect ratio ~85.6mm x 53.98mm = ~1.586:1)
- Cycles through 5 background colors: green, pink, red, gray, and yellow with smooth transitions
- Displays "tapaway.co" centered on the card in League Spartan font
- Retains the existing floating animation
- Has rounded corners and shadow matching the current premium feel

## Visual Design

```text
+------------------------------------------+
|                                          |
|                                          |
|             tapaway.co                   |
|          (League Spartan)                |
|                                          |
|                                          |
+------------------------------------------+
        ^^ cycles green -> pink -> red -> gray -> yellow
```

## Technical Details

### File: `index.html`
- Add Google Fonts import for League Spartan: `<link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@700&display=swap" rel="stylesheet">`

### File: `src/pages/CardResolver.tsx`

Replace the card image section (lines 257-271) with an animated div:

- Use a `div` with credit card aspect ratio (`aspect-[1.586/1]`, approx `w-64` wide which gives ~161px tall)
- Use `framer-motion`'s `animate` prop to cycle through background colors: `["#10B981", "#EC4899", "#EF4444", "#9CA3AF", "#EAB308"]` (Tailwind green-500, pink-500, red-500, gray-400, yellow-500)
- Transition duration: ~3s per color, infinite repeat
- Center "tapaway.co" text using `fontFamily: "'League Spartan', sans-serif"`, bold, white with a subtle text shadow for contrast
- Keep the existing float animation (`y: [0, -6, 0]`)
- Rounded corners (`rounded-2xl`) and shadow (`shadow-2xl shadow-teal-200/50`) stay the same

No other files change. The rest of the activation flow (steps, OTP, etc.) remains untouched.
