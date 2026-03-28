

# Fix Mobile Hero Responsiveness & Visual Polish

## Changes to `src/components/landing/HeroSection.tsx`

### 1. Typography — mobile headline sizing
- Change `text-4xl` to `text-3xl` for < 640px screens
- Wrap "5-Star" in `whitespace-nowrap` to prevent hyphen break

### 2. Trust Badge — pulsing green dot
- Add a pulsing green dot (`w-2 h-2 bg-emerald-500 rounded-full animate-pulse`) next to the Star icon

### 3. Button glow effect
- Add `shadow-[0_0_20px_rgba(59,130,246,0.5)]` to primary CTA link

### 4. Spacing improvements (mobile)
- Increase `mb-8` on subheadline to `mb-10`
- Add `mt-10 lg:mt-0` on the right visual column for mobile breathing room

### 5. 3D Card positioning
- On mobile (`lg:` breakpoint): card already renders below text, add a CSS tilt wrapper: `style={{ transform: "perspective(800px) rotateY(-15deg)" }}` around `TapAwayCard3D`
- On desktop: the grid already places it right; no overlap changes needed (would require negative margins and could break layout)

### No changes to `MobileNav`
- Logo and hamburger are already vertically centered in a `flex items-center justify-between h-14` container — alignment is correct.

## File modified
- `src/components/landing/HeroSection.tsx`

