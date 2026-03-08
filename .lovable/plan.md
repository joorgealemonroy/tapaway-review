

# Update Shop Showcase: New Product Content + Mobile-First Layout

## Changes

**File:** `src/components/landing/personal/PersonalShopShowcase.tsx`

### 1. Update product & revenue content
- Revenue: Change from `$1,536` / `+$240 this week` → `$4,280` / `+$720 this month`
- Product: Change from "Social Media Starter Kit" / "50+ templates" / `$9.99` → "Content Creator Masterclass" / "12 video lessons" / `$49`
- Product icon: Replace `ShoppingBag` with a play/video icon to convey "course"

### 2. Mobile-first layout fixes
The current layout uses `absolute` positioning for the revenue and product floating cards, which clips/overlaps badly on small screens. Fix:

- **Mobile (default):** Stack all three elements vertically — profile card, then revenue card, then product card — centered, no absolute positioning, no rotation. Use `flex flex-col items-center gap-6`.
- **Desktop (md+):** Use the current relative/absolute composed layout with floating cards and rotations.
- Reduce `minHeight: 520` on mobile (not needed when stacked).
- Ensure headline text is `text-2xl` on mobile, `text-5xl` on desktop.
- Reduce section padding on mobile: `py-12` → `py-20` on md+.

### 3. Implementation approach
Wrap the visual composition in a responsive container:
- Mobile: a simple `flex flex-col items-center gap-6` with all cards as `relative` (no absolute).
- Desktop: keep the current `relative` container with absolute-positioned floating cards.

Use a `hidden md:block` / `md:hidden` pattern or responsive classes to switch layouts cleanly.

**Single file change only:** `PersonalShopShowcase.tsx`

