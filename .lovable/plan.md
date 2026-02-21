

# Add Pro Trial Messaging to Hub Showcase + Free Layout Recommendation

## What Changes

### 1. Update subtitle in HubShowcase (`src/components/card/HubShowcase.tsx`)

Change the subtitle under "Real Hubs, Real People" from:
> "See what others are building -- copy any layout you like"

To:
> "These layouts require Pro -- try free for 7 days, cancel anytime"

This sets clear expectations before users interact with the cards.

### 2. Update toast messages in HubShowcase

When a user copies a layout, update the toast to reinforce the trial messaging:
- Premium layout: "Layout copied! Requires Pro -- 7-day free trial included."
- Non-premium layout: "Layout copied! Requires Pro -- 7-day free trial included."

Both paths lead to Pro signup, so the message is the same.

### 3. Add "Free layouts" nudge in AffiliateOnboarding (`src/components/affiliate/AffiliateOnboarding.tsx`)

After the Hub Showcase section and before the Layout Templates section, add a small text nudge:

> "Want something free? Pick a starter layout below"

with a down arrow, linking the two sections and guiding free-focused users to the templates.

### 4. Update Layout Templates section header

Add a subtle "Free" badge or note next to the Layout Templates heading so users understand these don't require a subscription.

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/card/HubShowcase.tsx` | Update subtitle + toast messages |
| `src/components/affiliate/AffiliateOnboarding.tsx` | Add "free layouts" nudge text between Showcase and Templates |
| `src/components/card/LayoutTemplates.tsx` | Add "Free" indicator to section header (if not already present) |

