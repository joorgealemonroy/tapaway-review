

# Developer Testing Loop for Magic Onboarding

## Summary
Add a Stripe bypass for admin/test accounts and a "Reset Onboarding" button so the admin can repeatedly test the Magic Onboarding flow without creating new accounts or completing Stripe checkout.

## Changes

### 1. Stripe Bypass in `src/pages/Onboarding.tsx`

Insert a check **before** the Stripe redirect block (line ~587), after the free promo block:

```typescript
// ── ADMIN/TEST BYPASS: skip Stripe for dev testing ──
const userEmail = session.user.email || '';
if (userEmail === 'tap@tapaway.co' || userEmail.includes('+test')) {
  console.log("[onboarding] Admin/test bypass — skipping Stripe");
  await supabase.from("restaurants").update({
    subscription_status: "active",
    onboarding_completed: true,
    onboarding_step: 4,
  }).eq("id", rId);
  try { await supabase.functions.invoke("finalize-onboarding", { body: { restaurantId: rId } }); } catch {}
  clearOnboardingData();

  if (resolvedDashboardType === 'personal' || plan === 'solo') {
    navigate("/dashboard?type=lite&welcome=true");
  } else {
    setShowSuccess(true);
  }
  return;
}
```

### 2. New Component: `src/components/admin/DeveloperResetButton.tsx`

- Small muted button: "Reset Onboarding (Dev)" with a `RotateCcw` icon
- Only renders when `user.email === 'tap@tapaway.co'`
- On click: shows an `AlertDialog` confirmation
- On confirm:
  1. `DELETE FROM personal_links WHERE profile_id IN (SELECT id FROM personal_profiles WHERE user_id = uid)` — done via two queries: fetch profile IDs, then delete links
  2. `DELETE FROM personal_profiles WHERE user_id = uid`
  3. `DELETE FROM restaurants WHERE owner_id = uid`
  4. Clear localStorage onboarding data
  5. `navigate("/onboarding")`

### 3. Place the Reset Button

Add it to the **SettingsTab** or **DashboardHeader** — render `<DeveloperResetButton />` at the bottom, guarded by admin email check at the component level.

## Files Changed/Created

| File | Action |
|------|--------|
| `src/pages/Onboarding.tsx` | Add admin/test Stripe bypass before Stripe redirect |
| `src/components/admin/DeveloperResetButton.tsx` | Create reset button component |
| `src/components/dashboard/SettingsTab.tsx` | Import and render DeveloperResetButton |

