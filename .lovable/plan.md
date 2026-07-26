Two small changes to the Sales Partner portal.

## 1. Delete button for draft demos only

In `src/pages/rep/RepBusinesses.tsx`, add a red **Delete** action next to Edit / Open in the row's action column.

Show the button only when the hub is still a draft:
- `hub.is_approved !== true` AND
- `hub.pipeline_status !== 'ready_for_review'`

Behavior:
- Click → confirm dialog ("Delete this draft? This cannot be undone.")
- On confirm: `supabase.from('personal_profiles').delete().eq('id', hub.id)`, then optimistically drop the row from state and toast success.
- If the row is approved or submitted, no button is rendered (defense in depth beyond RLS).

## 2. Rep preview of their own unapproved hubs

Today `UsernameResolver.tsx` only auto-enters preview mode for admins. Extend the same fallback so the rep who created the demo can also view it live before approval, with the same amber ribbon.

Changes in `src/pages/UsernameResolver.tsx`:
- After the "not publicly visible" branch, if the viewer is authenticated but not admin, attempt a direct `personal_profiles` select by slug. Existing RLS already restricts this to owner / admin / linked `sales_rep_id`, so a row will only come back for the rep that owns the demo.
- If a row is returned, set `resolvedProfile`, `resolvedType = "personal"`, and `adminPreviewActive = true` (reuse existing ribbon — copy stays generic: "Preview — this hub is not yet approved and not publicly visible.").
- Update the ribbon copy in `AdminPreviewRibbon` to remove the word "Admin" so it reads correctly for both admins and reps.

No DB / RLS changes needed — reps already have SELECT on `personal_profiles` rows where `sales_rep_id = auth.uid()`.

## Files touched
- `src/pages/rep/RepBusinesses.tsx` — add Delete button + handler
- `src/pages/UsernameResolver.tsx` — authenticated fallback + ribbon copy
