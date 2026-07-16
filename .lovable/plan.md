## Portal fixes: Canva link, Solo Pro pricing, 50-demo daily cap

### 1. Canva template URL → `https://canva.link/tapaway-temp`
- `src/pages/rep/RepBusinesses.tsx` — update `CANVA_TEMPLATE_URL`.
- `src/pages/rep/RepDocs.tsx` — update `CANVA_URL`.
- `src/pages/rep/RepResources.tsx` — replace placeholder `CANVA_URL`.

### 2. Solo Pro pricing copy ($10 → $15)
- `src/components/rep/PitchScriptDialog.tsx` line 10 — `$10–$39/mo` → `$15–$39/mo`.
- `src/pages/rep/RepClose.tsx` line 54 — commission `$10 upfront + $1.50/mo recurring` → `$15 upfront + $1.50/mo recurring`.
- `src/pages/rep/RepDocs.tsx` line 17 — SMS follow-up `$10/mo Solo` → `$15/mo Solo`.

### 3. Strict 50-demo daily cap

**`src/pages/rep/RepHome.tsx`**
- Add `const DEMO_CAP = 50;` alongside `DEMO_QUOTA` / `DEMO_BONUS`.
- Progress bar logic in the "Completed Demos Today" card:
  - `demosToday < DEMO_QUOTA` → existing amber `X / 10` progress toward quota.
  - `DEMO_QUOTA <= demosToday < DEMO_CAP` → emerald bar filling toward the cap, label `"X / 50 · Daily cap"`, badge stays green ("Quota Met · Bonus $Y").
  - `demosToday >= DEMO_CAP` → badge switches to muted rose "Daily Cap Reached" (`bg-rose-400/15 text-rose-200 border-rose-400/30`), bar full, helper copy `"Daily 50-demo cap reached — resets at midnight."`.
- "Create New Demo" CTA:
  - When `demosToday >= DEMO_CAP`, render as disabled button (`disabled`, `opacity-50 cursor-not-allowed`, no onClick), with a `title` tooltip: "Daily 50-demo cap reached — resets at midnight."
  - Otherwise unchanged.
- Bonus math already caps naturally at demos 10–50; no changes to base/recurring cards.

**`src/pages/rep/RepDemoCreate.tsx`**
- In `handleSubmit`, only on the create branch (`!editId`), before the `restaurants` insert:
  ```ts
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error: countErr } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', startOfDay.toISOString());
  if (countErr) throw countErr;
  if ((count ?? 0) >= 50) {
    toast.error("You've hit the 50-demo daily cap. Please continue tomorrow.");
    setSaving(false);
    return;
  }
  ```
- Edits to existing demos are unaffected.

### Out of scope
No schema, RLS, theme token, or layout changes. No modification to commission math or recurring-payout logic.