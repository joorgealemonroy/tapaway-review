

# Update Loss Protection Step Copy

## Changes to `src/pages/Onboarding.tsx`

### 1. Update refill text in PLAN_DETAILS (lines 26-27)
Change `refill` values:
- Solo: `"3-card"` 
- Venue: `"10-card"`

### 2. Update sub-headline (line 348)
Change from: `"In busy venues, cards tend to walk home with guests. Don't stop growing because a card went missing."`
To: `"Don't let missing cards stall your growth. Includes priority replacements, easy to claim anytime in your dashboard."`

### 3. Update first bullet point (line 366)
Change from: `{PLAN_DETAILS[selectedPlan].refill} + Priority Shipping`
To: `<strong>Monthly</strong> {refill} refills available when you need them.`

Render as: `<span><span className="font-bold">Monthly</span> X-card refills available when you need them.</span>`

### File modified
- `src/pages/Onboarding.tsx`

