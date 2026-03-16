

# Updated Plan: Immediate Storage Upload for Images

## The Problem
The current `handleCropComplete` stores a Base64 data URL in state. This massive string will be lost during OTP/OAuth redirects due to sessionStorage size limits.

## The Fix
Upload cropped images to Supabase Storage **immediately** in `PersonalizeStep.tsx`, storing only the returned public URL in state.

## Changes to the Approved Plan

Everything from the previously approved plan remains — empty-value inputs, half-width image support, expanded drawer, `displayStyle: "both"`. The only addition:

### `PersonalizeStep.tsx` — Immediate upload on crop complete

Replace the current `handleCropComplete` (line ~117-122) which stores a data URL:

```typescript
// BEFORE (data URL in state — breaks on redirect)
updateBlock(activeBlockId, { content: { alt: "My Photo", url: previewUrl } });
```

With an immediate Supabase Storage upload:

```typescript
const handleCropComplete = async (blob: Blob, _previewUrl: string) => {
  if (!activeBlockId) return;
  const fileName = `temp/${crypto.randomUUID()}.jpg`;
  const { data, error } = await supabase.storage
    .from("personal-link-images")
    .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
  if (error) { /* toast error, return */ }
  const publicUrl = supabase.storage.from("personal-link-images").getPublicUrl(fileName).data.publicUrl;
  updateBlock(activeBlockId, { content: { alt: "My Photo", url: publicUrl } });
};
```

Same pattern applies for half-width link cover images — upload immediately, store the public URL in `coverImageUrl`.

### `CheckoutStep.tsx` — No extra upload step needed

Since images are already uploaded and URLs are short strings, the existing insert logic works as-is. No sessionStorage size risk.

### Storage bucket

`personal-link-images` already exists and is public — no migration needed.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/personal/PersonalSignup.tsx` | Return `""` from `getFriendlyValue`, set `displayStyle: "both"` |
| `src/components/personal/signup/PersonalizeStep.tsx` | Empty-value inputs, immediate storage upload on crop, half-width image UI, expanded drawer, inline block editors |
| `src/components/personal/signup/CheckoutStep.tsx` | Default `display_style` to `"both"` |

