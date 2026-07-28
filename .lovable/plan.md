# Rep pipeline label + inline half-width add tile

## 1. Rename the "submitted for review" state to "In Progress"

Today the rep pipeline uses `pipeline_status` values: `draft`, `card_ready`, `delivered`, `converted`, `inactive`. When a rep clicks **Submit for review** the profile gets `pipeline_status = 'ready_for_review'` and shows up in the admin approval queue — but that value isn't in the dropdown's `PIPELINE_STATUSES` list, so the rep's own pipeline row falls back to displaying "Draft Profile", which is misleading.

Fix: add a labeled `ready_for_review` entry so it reads **In Progress**.

- `src/components/rep/StatusDot.tsx` — insert a new entry between `draft` and `card_ready`:
  - `{ value: 'ready_for_review', label: 'In Progress · Awaiting Approval', dot: 'bg-blue-400', ring: 'ring-blue-400/30' }`
- `src/pages/rep/RepBusinesses.tsx` — in the pipeline `<Select>`, skip the `ready_for_review` option in the dropdown items (reps can't self-select it; it's system-set on submit) but keep it in `PIPELINE_STATUSES` so the trigger renders the proper label + dot when a hub is in that state.
- Verify the same lookup works for approved hubs: once admin approves, we already set `is_approved=true` and don't reset `pipeline_status`, so the row will still say "In Progress" post-approval. Update `RepBusinesses.tsx` so that when `hub.is_approved === true` the status pill overrides to **Live · Approved** (green) regardless of the underlying `pipeline_status`.

## 2. Ensure the $5 demo bonus lands in the rep's available balance on approval

The `award-demo-commission` edge function already inserts a `demo_bonus` row with `commission_type: 'demo_bonus'`, `amount: 5`, `status: 'available'` when the admin approves a hub. Confirmed in `supabase/functions/award-demo-commission/index.ts:106,108,125` and it's already invoked from `AdminPendingHubApprovals.tsx` on approve.

The gap: **`RepHome.tsx`'s available-balance card doesn't count `demo_bonus` rows** — its aggregation was written for `shift_base` and `bonus` types only. Sub-tasks:

- `src/pages/rep/RepHome.tsx` — extend the "Available Balance" calculation to include any commission where `status === 'available'` (regardless of `commission_type`), so `demo_bonus`, `shift_base`, `annual_bounty`, and `closer_pool` all roll up together. Also surface a small "This month: N approved demos × $5" caption below the balance for transparency.
- Add a "Demo Bonuses" mini-stat next to Bounties showing the count and dollars from `demo_bonus` rows in the current month, so reps see the bonus land immediately after admin approval.
- Sanity check `RepCommissions.tsx` already lists `demo_bonus` (it does — added in the last turn) so the rep can drill into each $5 award.

No DB migration needed — schema and RLS already support it.

## 3. Inline "+ add half-width" button inside grid groups

`src/components/personal/DashboardUnifiedContent.tsx` renders consecutive half-width image-tile links as a 2-column grid (line 946). Today, to add another half tile a rep must scroll to the bottom **Add link** button and choose Grid layout again.

Fix: append a dashed **"+"** tile as the final cell of every grid group.

- In the grid-group render block (`DashboardUnifiedContent.tsx` ~940-1060), after mapping `groupedItem.links`, append one extra ghost cell:
  - Dashed border, `aspect-square rounded-xl`, centered `Plus` icon + tiny "Add tile" label.
  - `onClick` opens the existing `LinkModal` seeded with a "pending half-tile" hint via a new state slot (e.g. `setPendingGridInsert({ afterSortOrder: lastLinkInGroup.sort_order })`).
- Extend `handleAddLink` so that when `pendingGridInsert` is set, the new link is forced to `gridSize: 'half'`, `displayStyle: 'grid'`, and inserted with `sort_order = pendingGridInsert.afterSortOrder + 0.5` (existing normalization pass will re-index it into place, keeping it adjacent to the group).
- `LinkModal` already supports the "grid tile" layout, so no changes needed there — we just need to pre-select that layout when the modal opens from the ghost tile. Pass an optional `initialLayout="grid"` prop and honor it inside `LinkModal` on open.
- Reuse the same drag/drop code path — the newly added tile just becomes the last member of the group on next render because it shares the "half + cover image" grouping criteria.

## Technical details

- Available-balance query in `RepHome.tsx`: change the filter from `type === 'shift_base' | 'bonus'` to `status === 'available'` and sum `amount`.
- `pipeline_status = 'ready_for_review'` is set inside the rep-side "Submit for review" handler (already present in the dashboard save flow); no additional writes needed.
- Grid-group detection stays as-is (`grid_size === 'half' && cover_image_url && !is_featured`) — the newly created link will match once the modal enforces those fields.
- Nothing else touches commissions/aggregation, so no security or RLS changes.

## Out of scope

- No changes to the admin approval UI beyond the already-wired `award-demo-commission` invocation.
- No changes to Stripe webhook, closer pool logic, or annual bounty.
- No change to how full-width pill links render or reorder.