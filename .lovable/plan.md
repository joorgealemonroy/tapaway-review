
## Seamless full-banner background matching

### 1. New helper — `src/lib/sampleBannerColor.ts`

`sampleBottomEdgeColor(imageUrl: string): Promise<string | null>`

- Load image with `crossOrigin="anonymous"` in an offscreen `<canvas>`.
- Wrap the entire `drawImage` + `getImageData` block in a single `try/catch`; on any failure (CORS taint, load error, decode error) resolve with `null` so callers keep the current background untouched.
- Sampling window: **bottom-center 20% of width** × bottom 5% of height, stepped every ~4px.
- Skip pixels with alpha < 200.
- Average remaining RGB → return `#rrggbb`.

### 2. Auto-apply on banner upload — `src/pages/personal/tabs/DashboardDesignTab.tsx`

After a successful `header_image_url` upload:
- Call `sampleBottomEdgeColor(uploadedUrl)`.
- Read the current `background_color`. Only overwrite when it **exactly equals the app default hex** (locate the constant already used at profile creation — likely `#000000` or the value in `PersonalDashboard`/instant-profile helper). If unclear, define/reuse a shared `DEFAULT_BACKGROUND_COLOR` constant so both the creator and this handler reference the same source of truth.
- Persist both `header_image_url` and (conditionally) `background_color` in the same update.
- If the helper returns `null`, silently skip — never block the upload.

### 3. Live preview parity — `src/components/personal/LivePhonePreview.tsx`

- Run the same sampling when a new banner URL comes in via props/state so the preview updates instantly, before save.
- Same "only if still default" gate.

### 4. CSS feather on the full banner (new)

Apply to the banner `<img>`/`<div>` wherever `header_type === 'full_banner'` renders:

```
maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
```

Targets to update:
- `src/components/personal/LivePhonePreview.tsx` (rep editor preview)
- The public hub full-banner renderer — locate via a search for `header_type === 'full_banner'` / `full_banner` in `src/components/personal/*` and `src/pages/personal/*`; apply to the same element that currently shows the banner image. Do not change the layout, only add the mask styles.

### Out of scope

- No schema change — still using `background_color`.
- No behavior change to `image` or `solid` header types.
- No public-hub logic change beyond adding the CSS mask.
