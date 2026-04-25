# SMS VIP List — Standalone Block

A new optional block type (`sms_subscribe`) that lives alongside YouTube, Image, Email Capture, etc. It's added/reordered/removed exactly like every other block, and the existing "Save Contact" button is left completely untouched.

## 1. Add `sms_subscribe` to the Block picker

**File:** `src/components/personal/BlockModal.tsx`

- Add to the `BLOCK_TYPES` array (between `email_capture` and `photo_collage`):
  ```ts
  { type: "sms_subscribe", label: "SMS VIP List", icon: Smartphone,
    description: "Let visitors join your text list" }
  ```
  (`Smartphone` is already imported.)
- Add a small editor section when `selectedType === "sms_subscribe"` with two optional inputs:
  - **Headline** (default: `"Join our VIP Text List"`)
  - **Description** (default: `"Get exclusive updates and offers via text."`)
  - **Button label** (default: `"Join the VIP List"`)
- In the existing `handleSave` switch, add a `case "sms_subscribe"` that builds:
  ```ts
  content = { headline, description, buttonText };
  ```
  (No required fields — defaults are fine.)
- Add reset logic for the three new state vars in `resetForm` and the populate logic in the editing-block `useEffect`.

That's all that's needed for **Step 1** — drag-and-drop, reorder, hide, delete, and persistence are all already handled by `DashboardUnifiedContent` / `BlocksManager` because they are block-type-agnostic.

(`DashboardBlocksManager.tsx` is a legacy component not used in the live unified dashboard, so no changes needed there. Confirmed by grep — the live flow goes through `BlockModal`.)

## 2. Render the block on the profile

Two renderers handle blocks. Both get a new `case "sms_subscribe"` in their existing block switch.

### A. `src/components/personal/ProfilePreviewRenderer.tsx` (~line 534 switch)
Add a button-style pill that matches the visual language of other featured pills. On click in preview mode it just calls `onLinkClick?.("#sms")` (no real submission in preview). Visible label = `content.buttonText || "Join the VIP List"`.

### B. `src/pages/personal/PersonalProfilePage.tsx` (~line 507 switch, near the existing `case "email_capture"` at ~line 620)
Real implementation. Renders a prominent card:

```text
┌───────────────────────────────────────┐
│  📱  Join our VIP Text List           │
│      Get exclusive updates & offers   │
│      [  Join the VIP List  ]          │
└───────────────────────────────────────┘
```

- Uses the profile's `button_theme` / `text_color` so it visually matches other pills.
- Clicking the button opens the new opt-in drawer (state lifted to the page, similar to how `email_capture` already manages its inline form state).

## 3. The opt-in drawer + submission

**New component:** `src/components/personal/SmsOptInDrawer.tsx`

- Uses the existing `Drawer` primitive (`@/components/ui/drawer`) on mobile and `Dialog` on desktop — same responsive pattern used elsewhere (e.g. `BlockModal`, `ResponsiveModal`).
- Props: `{ open, onOpenChange, profileId, headline, description }`.

**Drawer contents:**
- `<h3>` headline + muted description.
- Inputs:
  - **Full Name** — required, `autoComplete="name"`.
  - **Phone Number** — required, `inputMode="tel"`, `type="tel"`, `autoComplete="tel"`.
- Validation with `zod`:
  ```ts
  z.object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(7).max(20).regex(/^[\d\s+()-]+$/),
  })
  ```
- Submit button: `"Join the VIP List"` with loading spinner.
- Below: muted TCPA text — *"Msg & data rates may apply. Reply STOP to opt out."*

**On submit:**
```ts
await supabase.from("personal_email_captures").insert({
  profile_id: profileId,
  name: name.trim(),
  phone: phone.trim(),
  email: null,
  sms_opt_in: true,
  sms_opt_in_at: new Date().toISOString(),
});
```
Anon insert is already allowed by the existing RLS policy on `personal_email_captures`. On success: `toast.success("You're on the list! 🎉")` and close the drawer. On error: `toast.error("Something went wrong, please try again.")`.

## Files

**Create**
- `src/components/personal/SmsOptInDrawer.tsx`

**Edit**
- `src/components/personal/BlockModal.tsx` — add type to picker + small editor + save case + reset/populate.
- `src/components/personal/ProfilePreviewRenderer.tsx` — add `sms_subscribe` case (preview-only pill).
- `src/pages/personal/PersonalProfilePage.tsx` — add `sms_subscribe` case that opens `SmsOptInDrawer`.

## Out of scope (intentionally untouched)

- The "Save Contact" button and any `contact_*` profile columns.
- The existing `email_capture` block.
- Database schema — `sms_opt_in` / `sms_opt_in_at` columns on `personal_email_captures` already exist from the prior migration.
- The dashboard SMS Marketing tab and `send-mass-sms` edge function — already built and unaffected. New opt-ins from this block will automatically flow into that tab's audience count.
