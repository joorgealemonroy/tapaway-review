

# Mobile-First Pricing Page Redesign

## Goal

Redesign the pricing page to feel natural and approachable on mobile -- not like a pushy paywall. The user should immediately see value and *want* to choose Pro without feeling pressured. The Free option stays visible and accessible.

## Design Approach

Instead of two side-by-side cards (which stack awkwardly on mobile), switch to a **toggle-based single-card view** with a clean, app-like feel.

## Layout (top to bottom on mobile)

1. **Minimal header** -- stays as-is (TapAway logo + Sign in)

2. **Hero copy** -- softer, benefit-focused:
   - Headline: "Pick your vibe" (casual, low-pressure)
   - Subtitle: "Start free, upgrade when you're ready."
   - Remove the trust badge icons (too corporate for this vibe)

3. **Plan toggle** -- a segmented control pill (Free | Pro) centered on screen
   - Tapping switches which plan's details are shown below
   - Pro is pre-selected (default) but Free is one tap away
   - Uses a rounded pill with a sliding highlight indicator

4. **Single plan card** -- shows the selected plan's info:
   - Plan name + price (large, clean)
   - Feature list with green checkmarks
   - For Pro: show the $6.25/mo breakdown subtly, yearly/monthly toggle inside the card
   - For Free: show what's included, no pricing pressure
   - CTA button at the bottom:
     - Pro: "Get Started" (not mentioning price in the button)
     - Free: "Start Free"

5. **Social proof line** -- "30-day money-back guarantee" + "Questions? Contact us" at the bottom, small and unobtrusive

## Key UX Decisions

- **No "RECOMMENDED" badge** -- the toggle defaulting to Pro is enough. Badges feel salesy.
- **No strikethrough prices** -- removing the "$120" crossed out. Just show the real price cleanly.
- **No X marks on the Free plan** -- instead of showing what Free *doesn't* have, only show what it *does* have. Positivity converts better.
- **Yearly/monthly stays inside the Pro card** as two subtle buttons, not separate cards.
- **Smooth animation** between plan switches using framer-motion's AnimatePresence.

## Technical Details

### File: `src/pages/personal/PersonalPricing.tsx`

**Plan toggle component (inline):**
- Two-option segmented control using `useState<'free' | 'pro'>('pro')`
- Styled as a rounded-full container with `bg-muted` background
- Active segment gets `bg-foreground text-background` with a `motion.div layoutId="toggle"` for smooth sliding animation

**Plan card rendering:**
- `AnimatePresence mode="wait"` wrapping a `motion.div` keyed by the selected plan
- Entry: `opacity: 0, y: 10` to `opacity: 1, y: 0`
- Exit: `opacity: 0, y: -10`

**Pro card internal pricing toggle:**
- `useState<'yearly' | 'monthly'>('yearly')` for the billing cycle
- Two small pill buttons inside the card to switch
- Price display updates: `$75/year` vs `$10/month`

**Mobile sizing:**
- Card: `max-w-md mx-auto px-5 py-6` -- compact, not full-bleed
- Feature list: `text-sm` with `space-y-2.5`
- CTA button: `w-full h-12 text-base font-semibold rounded-xl`
- Overall section padding: `px-4 py-10`

**Responsive:**
- On `lg+`: can optionally show both cards side by side (but the toggle approach works well at all sizes, so keeping single-card is fine)
- The toggle approach is inherently responsive -- no grid breakpoints needed

**Dependencies:** None new -- uses existing framer-motion, lucide-react, and UI components.

