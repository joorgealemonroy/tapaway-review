

# Always-Green "Available" Message

Change the "✓ tapaway.co/...is available!" text color from the dynamic `accentColor` to a hardcoded green (`#22c55e`) for consistent dopamine hit.

**File**: `src/components/personal/signup/ClaimStep.tsx` — update the `style={{ color: accentColor }}` on the available message `<motion.p>` to `style={{ color: "#22c55e" }}`.

