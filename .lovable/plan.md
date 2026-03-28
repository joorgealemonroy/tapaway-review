

# Premium Mobile Hero Redesign

## Changes to `src/components/landing/HeroSection.tsx`

### 1. Container spacing & padding
- Change `px-4` to `px-6 sm:px-8` for breathing room on mobile
- Change `py-12` to `py-16` for more vertical space on mobile

### 2. Trust Badge — glassmorphism refinement
- Replace `bg-primary/10 text-primary` with `bg-slate-900/40 border border-slate-800 text-slate-300 backdrop-blur-sm`
- Keep the pulsing green dot and star icon; star gets `fill-primary text-primary`
- Change `mb-5` to `mb-8` for more breathing room before headline

### 3. Typography
- Already `text-3xl` on mobile — keep as-is
- Add `leading-tight` alongside `leading-[1.1]` (replace with `leading-[1.08]` for tighter feel)
- Change headline `mb-6` to `mb-8`

### 4. Sub-headline spacing
- Change `mb-10` to `mb-12` for more gap before buttons

### 5. Button architecture — full-width stacked on mobile
- Wrap both buttons: make the outer div `flex flex-col sm:flex-row gap-4`
- Primary button wrapper: add `w-full sm:w-auto`; Link gets `w-full sm:w-auto` 
- Secondary button: add `w-full sm:w-auto`
- Both buttons get matching `py-4` height for symmetry
- Primary button: keep existing glow, add `hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]`

### 6. 3D Card — premium floating object
- Change `mt-10` to `mt-16 lg:mt-0` on the visual column
- Replace the inline transform `perspective(800px) rotateY(-15deg)` with `perspective(1000px) rotateX(10deg) rotateY(-5deg)` for a more dramatic floating feel

### 7. City social proof
- Keep as-is, already clean

## Changes to `src/components/landing/MobileNav.tsx`

### Header alignment cleanup
- The nav already uses `flex items-center justify-between px-4 h-14` which is correct
- Remove the `border-b border-border` and replace with a cleaner `border-t-0` (no accent bar at top); keep the bottom border as a subtle `border-b border-border/50` for a softer line

## Files modified
1. `src/components/landing/HeroSection.tsx`
2. `src/components/landing/MobileNav.tsx`

