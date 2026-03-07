

# Fix Profile Readability, Billing Display, Pro Features & Email Sender

## Issues Identified

1. **Profile text unreadable on light backgrounds** — The profile page uses `text-foreground` (theme-aware) for light backgrounds. In dark mode, `text-foreground` resolves to white → invisible on a white/light profile background set via inline CSS. The footer CTA "Start using TapAway" and "Tap-enabled" have the same problem.

2. **"$0 forever" displayed for Free plan** — Should just show "$0" with no subtext.

3. **Creator Shop missing from Pro features list** — The billing tab's Pro features comparison doesn't mention the Shop/Creator Marketplace.

4. **OTP email sent from random SES address** — The `EMAIL_FROM` secret is likely set to a bare or incorrect address. Resend needs it set to `TapAway <tap@tapaway.co>` to display properly. The `send-custom-otp` function already wraps bare addresses, but the underlying `EMAIL_FROM` value itself may be wrong (e.g., a raw SES address).

## Plan

### 1. Fix Profile Readability (`PersonalProfilePage.tsx`)

Replace all theme-aware text classes (`text-foreground`, `text-muted-foreground`) with explicit color classes that are guaranteed readable against the actual inline background:

**Lines 1029-1032** — Change text class logic:
```typescript
// When isDarkBg is false, use explicit dark text (not theme-aware) since
// the background is set via inline CSS and may conflict with dark mode
const headingClass = isDarkBg ? "text-white" : "text-gray-900";
const textClass = isDarkBg ? "text-white/80" : "text-gray-800";
const mutedClass = isDarkBg ? "text-white/60" : "text-gray-500";
```

**Footer (lines 1296-1323)** — Same fix for "Start using TapAway" and "Tap-enabled":
- Replace `text-foreground/70` → `text-gray-700`
- Replace `text-foreground/80` → `text-gray-800`
- Replace `text-muted-foreground/50` → `text-gray-400`
- Replace `bg-white/40 border-white/30` → `bg-black/5 border-black/10` for light backgrounds

Also fix the "No links yet" text (line 1254), action buttons (lines 1127-1144), and avatar border (line 1154) to use explicit colors instead of theme-aware ones.

### 2. Remove "forever" from Free Plan

**File: `src/lib/personalPlanLimits.ts` (line 5)**
- Change `priceSubtext: 'forever'` → `priceSubtext: ''`

### 3. Add Creator Shop to Pro Features

**File: `src/components/personal/PersonalBillingTab.tsx` (lines 177-193)**
- Add `<li>Creator Shop</li>` to the Pro features list (with Crown icon)

### 4. Fix OTP Email Sender Address

The `EMAIL_FROM` secret needs to be updated to `TapAway <tap@tapaway.co>`. The code in `send-custom-otp` already has wrapping logic (line 98: `rawFrom.includes("<") ? rawFrom : TapAway <${rawFrom}>`), but if the secret value itself is something like `0100019cc7402923...@send.tapaway.co`, the wrapping produces the wrong address. Need to update the secret to the correct value.

Update `EMAIL_FROM` secret → `TapAway <tap@tapaway.co>`

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Replace theme-aware text classes with explicit colors for light backgrounds |
| `src/lib/personalPlanLimits.ts` | Remove "forever" from free plan priceSubtext |
| `src/components/personal/PersonalBillingTab.tsx` | Add "Creator Shop" to Pro features list |
| `EMAIL_FROM` secret | Update to `TapAway <tap@tapaway.co>` |

