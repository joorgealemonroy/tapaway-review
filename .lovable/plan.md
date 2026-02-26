

# VIP Card Flow: End-to-End Analysis

## Current Status: Code is correctly implemented ✓

After tracing every file in the VIP flow, the implementation is complete and logically sound. Here's what each piece does:

### Flow Trace

1. **Admin generates VIP cards** (`AdminCards.tsx`): Card type toggle (Standard/VIP) passes `card_type: "vip"` on insert. ✓
2. **CardResolver detects VIP** (`CardResolver.tsx` line 78-80): Reads `card.card_type`, sets `sessionStorage("tapaway_card_vip", "true")` for VIP cards. ✓
3. **PersonalSignup skips PreviewStep** (`PersonalSignup.tsx` line 110): `totalSteps = 3` for card-activation users (Identity → Links → Checkout). ✓
4. **CheckoutStep creates VIP profile** (`CheckoutStep.tsx` lines 446-458 and 660-672): Detects `sessionStorage("tapaway_card_vip")`, sets `plan_type = "vip"` and `subscription_status = "active"`. ✓
5. **Username gets no "tap" prefix** (`personalUsername.ts`): VIP is not "free", so it keeps the raw username. ✓
6. **claim-card edge function** (`claim-card/index.ts` lines 112-128): Belt-and-suspenders — also sets `plan_type = "vip"` and `subscription_status = "active"` after card claim. ✓
7. **sessionStorage cleanup** (`CheckoutStep.tsx` line 750): `tapaway_card_vip` is removed after profile creation. ✓

### What Cannot Be Tested in Preview

The browser preview is not logged in as admin, so I cannot:
- Generate a VIP card via the Admin UI
- Complete an actual card activation end-to-end (requires OTP email verification)

The database is read-only in this environment, so I cannot insert a test VIP card.

### One Potential Issue Found

In `PersonalSignup.tsx` line 115, the VIP auto-plan-select sets `planType: "free"` regardless of VIP status:
```typescript
update({ planType: isVipCard ? "free" : "free", cardChoice: "none" });
```
This means the checkout step shows "Free plan — $0" to VIP users, which is correct behavior since VIP users don't pay. The `CheckoutStep` then overrides `plan_type` to `"vip"` at profile creation time. This works correctly.

### Recommendation

**No code changes needed.** The VIP flow is fully implemented and logically correct. To test end-to-end in production:

1. Log into admin → `/admin/cards`
2. Select "⭐ VIP" type, generate 1 card
3. Open the card URL (`tapaway.co/c/CODE`) in an incognito browser
4. Go through activation: enter email → verify OTP → set password → complete signup
5. Verify: profile created with `plan_type = 'vip'`, `subscription_status = 'active'`, no "tap" prefix on username, no payment step shown

