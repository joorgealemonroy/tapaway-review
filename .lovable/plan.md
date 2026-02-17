

# Update Pro CTA to "Try Pro Free for 7 Days"

## Changes

### File: `src/pages/personal/PersonalPricing.tsx`

1. **Button text**: Change "Get Started" to **"Try Pro Free for 7 Days"**
2. **Navigation URL**: Append `&trial=7` flag to the signup route so the signup flow knows this is a trial:
   - Before: `/personal/signup?plan=yearly`
   - After: `/personal/signup?plan=yearly&trial=7`
3. **Add subtle reassurance text** below the CTA button: "No charge today -- cancel anytime" in `text-xs text-muted-foreground` to reinforce the zero-risk message

Single file change, roughly 4 lines modified.

