

# Remove IdentityStep — Always Use ClaimStep

The screenshot shows the legacy `IdentityStep` component which appears when users sign up without the vibe flow. Replace it so **all** signup paths use `ClaimStep`.

## Changes

### `src/pages/personal/PersonalSignup.tsx`
- Remove the `IdentityStep` import
- Replace the conditional at line 446-468: instead of checking `fromVibeFlow` to decide between `ClaimStep` and `IdentityStep`, always render `ClaimStep` for step 1
- Pass `vibeMetadata` as `null` when not from vibe flow (already handled by ClaimStep)

### No other files need changes
`ClaimStep` already handles both OAuth and email flows, username claiming, and all auth logic. `IdentityStep` can be left in the codebase as dead code (or deleted).

