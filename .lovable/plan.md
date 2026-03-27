

# Remove Free Tier from Billing Tab — Show Single "Business" Plan

## Changes

### `src/components/personal/PersonalBillingTab.tsx`
Replace the two-column Free vs Pro feature comparison (lines 138-201) with a single-column "Your Business Plan" features list showing everything the user gets. Remove the "Free" badge, "Pro" badge, "$15/month" label from features section, and "Everything in Free" line. Combine all features into one unified list with checkmarks:

- Unlimited links
- Social icon bar
- YouTube embeds
- Image & text blocks
- Button blocks
- Email capture block
- Custom header image
- Photo collage block
- Advanced analytics
- Creator Shop

Title the card "Your Plan Includes" or "Business Features" instead of "Plan Features".

### `src/lib/personalPlanLimits.ts`
Remove the `free` plan object entirely and the `FEATURE_LIST` comparison array since there's no longer a free vs pro distinction.

No other files need changes — this is scoped to the billing tab UI and the plan limits config.

