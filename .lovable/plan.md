## Refactor Demo Hub Creation → Live Visual Editor + Admin Approval Gate + Public Hub Rendering

### Part 1 — DB migration (additive)
New columns on `restaurants`:
- `is_approved boolean default false`
- `google_place_id text`
- `business_phone text`
- `background_theme_style text default 'default'`
- `primary_color text default '#00C2FF'`
- `secondary_color text default '#0F172A'`

Backfill: existing rows set `is_approved = true` so already-live demos keep counting toward reps. No RLS/policy changes. Existing `sync_google_review_url` trigger auto-derives `google_review_url` from `google_place_id`.

### Part 2 — RepDemoCreate.tsx: split-screen live editor
Replace the single-column form with `grid-cols-1 lg:grid-cols-2 gap-8` inside the existing obsidian shell.

**Left column — configuration**
- **Business Info card:** `business_name`, `business_phone` (new, helper "Direct line for customers to call"), `website_url` (marked Optional), `instagram_url` + `yelp_review_url` grouped under "Optional platforms".
- **Google Place ID card:** single input → `google_place_id`; helper link "How to find a Place ID" (new tab). No URL paste; trigger builds the review URL.
- **Brand Engine card:** logo upload, gallery uploader (3 max), primary/secondary color pickers, background theme dropdown with values `default` (Solid Obsidian), `carbon` (Dark Brushed Carbon), `floral` (Floral Pattern Gradient), `aurora` (Aurora Gradient).

**Right column — live phone simulator**
New `src/components/rep/LivePhonePreview.tsx`.
- Device frame: `border-[12px] border-zinc-800 rounded-[3rem] h-[750px] shadow-2xl bg-[#0a0e1a] overflow-hidden sticky top-4`.
- Real-time render from local form state: hero (background style + logo + name), horizontal scrollable gallery cards, action buttons styled from `primary_color`/`secondary_color`: "Leave Us A 5 Star Review!", "Check us out on Yelp!", "Follow on Instagram", "Call Us Now", "Visit Website" (each only if the underlying field is filled).

Existing slug generation and 50/day cap preserved.

### Part 3 — Two-step submission
`handleSubmit` becomes a small state machine `step: 'edit' | 'upload_pdf' | 'done'`.

1. **Create branch:** insert with `is_approved = false`, run existing 50-cap check, store new id, transition to `upload_pdf` (no navigation).
2. **Upload step:** full-panel "Step 2: Upload Print File" using existing `card-print-files` bucket + `handlePdfUpload`; PDF-only, 15MB max. On success write `card_print_pdf_path`.
3. **Done step:** "Submitted for Admin Review! Your manager will review this page shortly." + button back to `/rep/restaurants`.

Edit flow (`editId` present) keeps in-place save behavior.

### Part 4 — Strict admin approval gate
**Rep counting (`is_approved = true` only)**
- `src/pages/rep/RepHome.tsx`: today's demo count filters `.eq('is_approved', true)`. Progress bar, quota badge, and bonus math read the approved count. Adds a muted "Pending admin review: N" line for unapproved drafts.
- `src/pages/rep/RepCommissions.tsx`: any demo-count aggregation for payout projections adds `is_approved = true`. The `commissions` table rows are untouched.
- `RepDemoCreate.tsx` daily-cap check stays on raw creations (spam guard).

**Admin approval UI**
- Extend `src/components/admin/AdminBusinessLiteTable.tsx` with an "Approval" column: `StatusDot` (emerald Approved / amber Pending). When `is_approved = false`, show emerald "Approve Hub" button + secondary "Review Layout" opening `/:custom_slug` in a new tab. Clicking Approve runs `update restaurants set is_approved = true where id = ?`, toasts success, refetches. Existing admin RLS on `restaurants` already permits updates.

### Part 5 — Public hub rendering (`/:slug`)
Update the public business hub renderer so the simulator matches reality.

- **Background:** the outermost hub container binds `background_theme_style`:
  - `default` → solid `#0a0e1a`
  - `carbon` → dark brushed-carbon overlay (linear-gradient + subtle noise)
  - `floral` → floral pattern gradient backdrop
  - `aurora` → aurora gradient
  - Mapping centralized in a new helper `src/lib/hubThemes.ts` returning `{ backgroundStyle: CSSProperties, overlayClassName?: string }` so simulator + public hub share one source of truth.
- **Action buttons:** primary CTAs (Review, Yelp, Instagram, Call, Directions/Website) get inline `style={{ backgroundColor: primary_color, color: contrastOn(primary_color) }}` and use `secondary_color` for secondary/outline treatments. Contrast helper picks black/white text based on luminance.
- Fallbacks: missing/invalid hex → falls back to current tokens; missing theme string → `default`.
- Only presentation changes; no route, data-fetch, or SEO changes to the hub.

### Technical notes
- Shared theme + contrast helpers live in `src/lib/hubThemes.ts`, consumed by both `LivePhonePreview.tsx` and the public hub component.
- Client no longer writes `google_review_url` on create; trigger handles it. Edit form treats derived URL as read-only.
- No storage bucket or policy changes (`restaurant-logos` public, `card-print-files` private).

### Out of scope
- Commission math, RLS, storage policies.
- Non-CTA styling on the public hub (menus, footers, etc.) beyond background + primary buttons.
- Legacy `google_review_url` paste field (removed from create; edit shows derived URL only).