

# Product Preview Feature — Modal, Dual Buttons & Enhanced Descriptions

## 1. Database Migration

Add `long_description TEXT` column to `creator_products` for rich, long-form product descriptions (the existing `description` stays as the short teaser shown on cards).

## 2. New Component: `ProductPreviewModal.tsx`

**File: `src/components/personal/ProductPreviewModal.tsx`**

A responsive modal (Dialog on desktop, Drawer on mobile via the existing `ResponsiveModal` pattern) that shows:
- **Image carousel** using Embla (already installed) displaying `cover_image_url` + all `image_urls` with dot indicators and swipe navigation
- **Full title, price badge, product type tag**
- **Long description** (falls back to `description` if no `long_description`), rendered with `whitespace-pre-line` for line break support
- **Sticky "Buy Now" button** at the bottom of the modal content

## 3. Dual-Button UI on Product Cards

**File: `src/pages/personal/PersonalProfilePage.tsx`**

### `ProductCard` (Shop Section):
- Keep "Buy Now" as the primary CTA
- Add a secondary "View Details" outlined button next to it
- Clicking "View Details" opens the `ProductPreviewModal`

### `ProductBlockCard` (Draggable Block):
- Replace single "Get it Now" with two stacked buttons: primary "Get it Now" + outlined "Preview"
- Both trigger their respective actions

Both components receive a new `onPreview` callback prop.

## 4. State Management in `PersonalProfilePage`

Add state for the preview modal:
```typescript
const [previewProduct, setPreviewProduct] = useState<any | null>(null);
```

Pass `onPreview={(product) => setPreviewProduct(product)}` to both `ProductCard` and `ProductBlockCard`. Render `<ProductPreviewModal>` once at the page level.

## 5. Creator Dashboard — Enhanced Form

**File: `src/components/personal/PersonalShopTab.tsx`**

- Change gallery max from 8 → 5 per the user's request
- Add a "Long Description" textarea below the existing description field, with a hint like "Sell your product — supports line breaks"
- Update `handleSaveProduct` to save `long_description` to the database
- Update the live preview card to show a truncated version of the long description

## 6. Files Summary

| File | Change |
|------|--------|
| DB migration | Add `long_description TEXT` to `creator_products` |
| `src/components/personal/ProductPreviewModal.tsx` | New — responsive modal with image carousel + full description + sticky buy button |
| `src/pages/personal/PersonalProfilePage.tsx` | Add dual buttons to `ProductCard` and `ProductBlockCard`, add preview modal state + render |
| `src/components/personal/PersonalShopTab.tsx` | Add long description field, cap gallery at 5 |

