

# Exclude Specific Profiles from Hub Showcase

## What Changes

Filter out the usernames `lovie` and `tapjorge` from the HubShowcase query so they no longer appear in the "Real Hubs, Real People" section on the card onboarding page.

## Technical Details

### File: `src/components/card/HubShowcase.tsx`

**Around line 55-59** -- Add a `.not("username", "in", ...)` filter to the query:

```typescript
// Before
.eq("subscription_status", "active")
.not("profile_photo_url", "is", null)
.limit(6);

// After
.eq("subscription_status", "active")
.not("profile_photo_url", "is", null)
.not("username", "in", '("lovie","tapjorge")')
.limit(6);
```

This uses PostgREST's `not.in` filter to exclude those two usernames at the database level. No other files need changes.

