## Make VIP Text List the #1 CTA on restaurant hubs

In `src/pages/ReviewHub.tsx`, promote the "Join our VIP Text List" button to the top of the action stack on the restaurant review hub so it's the first thing visitors see and tap after the header.

### Changes

1. **Reorder the action buttons** (currently: Google → Yelp → Instagram → SMS VIP → Directions → Phone). New order:
   - **Join our VIP Text List** (first)
   - Leave a Google Review
   - Find Us on Yelp
   - Follow Us on Instagram
   - Directions
   - Phone

2. **Boost the VIP button's visual weight** so it reads as the hero CTA without overwhelming the card:
   - Larger padding (`18px 16px` vs `14px 16px`)
   - Slightly larger font (`16px`, weight `800`)
   - Soft purple glow shadow (`0 8px 24px rgba(99,102,241,0.35)`)
   - Slightly larger icon (`20px`)
   - Keep the existing indigo→violet gradient so it visually pops above the white/neutral review buttons
   - 16px bottom margin to separate it from the secondary actions below

No other behavior, drawer, or backend changes — just reordering and a small visual bump. The AvMealPrep custom hub is unaffected.