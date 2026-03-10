

# Simplify /personal/pricing — Founding Creator Focus

## Problem
The page has too much content (hub showcase, layout templates, "What Is a Hub?" cards, multiple scroll prompts). Visitors — especially from TikTok/Instagram — bounce before taking action. The page needs to be shorter, cleaner, and centered on the founding creator urgency.

## Redesign

Strip the page down to 4 sections (from 7):

1. **Hero** — Keep the animated card + headline, but replace subtitle with the founding creator pitch. Add a live spots counter (via `get_founding_count()` RPC). Remove the "scroll to see examples" link.
   - Headline: "All Your Links, One TapAway"
   - Urgency line: amber badge showing "🚀 X spots left — Pro free for life"
   - CTA: "Claim My Free Pro Hub"

2. **How It Works** — Keep the 3 steps, unchanged.

3. **Social proof strip** — Replace the heavy "What Is a Hub?" info cards with a single-line trust strip: "Join 13+ creators already on TapAway" (dynamic count from the same RPC).

4. **Bottom CTA** — "Claim My Free Pro Hub" + "No credit card required" subtext.

**Removed entirely**: HubShowcase, LayoutTemplates, "Free layouts nudge", mid-page CTA, all ChevronDown scroll prompts.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/personal/PersonalPricing.tsx` | Rewrite to simplified 4-section layout with founding counter |

No new components needed — we reuse the `get_founding_count` RPC inline.

