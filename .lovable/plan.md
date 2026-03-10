

# Skip Pricing Page — Go Straight to Signup

## Rationale
Users clicking "Create Your Own!" have already expressed intent. The pricing page is an extra step that adds friction. Bypassing it sends users directly to the signup flow.

## Changes

### 1. Update CTA links in two files
Change `to="/personal/pricing"` → `to="/personal/signup"` in:
- **`src/components/landing/personal/PersonalHero.tsx`** (line 102)
- **`src/components/landing/personal/PersonalFooterCTA.tsx`** (line 55)

### 2. Keep the pricing page and route intact
The `/personal/pricing` route stays functional for direct visits or future use — we're just removing it from the main funnel path.

**No other files need changes.** Two one-line edits total.

