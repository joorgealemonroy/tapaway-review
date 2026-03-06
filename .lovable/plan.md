

# Product Images, Shop Section & Product Block

## 1. Database Migration

Add columns to `creator_products`:
- `image_urls TEXT[]` — array of additional gallery image URLs
- Keep existing `cover_image_url` as the primary/thumbnail image

Add column to `personal_profiles`:
- `show_shop_section BOOLEAN DEFAULT true` — toggle for the shop section visibility

## 2. PersonalShopTab — Image Upload Enhancements

**In the product creation form:**
- Add a multi-image uploader below the existing cover image input. Allow uploading multiple gallery images to the `personal-photos` bucket under `{userId}/{productId}/gallery/`.
- Store the resulting public URLs in `image_urls` array on the product.
- Show a live **preview card** of the product while editing (cover image, title, price, description).

**In the product list:**
- Display the cover image thumbnail on each product card.
- Add a "Show Shop on Profile" toggle at the top that updates `personal_profiles.show_shop_section`.

## 3. Shop Section on Profile (Automatic)

**File: `src/pages/personal/PersonalProfilePage.tsx`**

- Fetch `show_shop_section` from the profile (via the existing `personal_profiles_public` view or the profile query).
- Only render the "Shop" section if `show_shop_section` is true AND `creatorProducts.length > 0`.
- Update `ProductCard` to show gallery images as a mini carousel/swipeable strip when the card is tapped/expanded.
- The shop section remains at the bottom of the content area but is rendered as a distinct section.

## 4. Product Block (Draggable)

Add a new block type `"product"` to the existing block system so creators can embed individual products inline with their links/blocks.

**File: `src/components/personal/BlockModal.tsx`**
- Add `product` to `BLOCK_TYPES` array with a ShoppingBag icon.
- In the product block editor: show a dropdown of the creator's existing products (fetched from `creator_products`).
- Store `{ product_id: string }` in the block's content.

**File: `src/pages/personal/PersonalProfilePage.tsx`**
- In the `ProfileBlock` component, add a `case "product"` that:
  - Looks up the product from the `creatorProducts` array by `product_id`.
  - Renders a styled card with cover image, title, price tag, and a "Get it Now" CTA button.
  - On click, triggers the same `handleBuyProduct` flow.

**File: `src/components/personal/DashboardUnifiedContent.tsx`**
- Add the `product` block type icon to the block type display map.

**File: `src/components/personal/ProfilePreviewRenderer.tsx`**
- Add product block rendering to the preview renderer (mirrors profile page logic).

## 5. UI Design for Product Block

The product block renders as a rounded card matching existing link/block design:
- Cover image across the top (aspect-ratio 16/9).
- Title in bold, description truncated to 2 lines.
- Price badge (e.g., `$9.99`) styled as a prominent pill in the top-right corner of the image.
- "Get it Now" CTA button spanning full width at the bottom.
- Matches the dark/light theme of the profile.

## 6. Files to Modify

| File | Change |
|------|--------|
| DB migration | Add `image_urls` to `creator_products`, `show_shop_section` to `personal_profiles` |
| `src/components/personal/PersonalShopTab.tsx` | Multi-image upload, preview card, shop toggle |
| `src/components/personal/BlockModal.tsx` | Add `product` block type with product picker dropdown |
| `src/pages/personal/PersonalProfilePage.tsx` | Conditional shop section, product block rendering, gallery carousel in ProductCard |
| `src/components/personal/DashboardUnifiedContent.tsx` | Add product block icon |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Add product block preview rendering |
| `src/components/admin/AdminBlocksManager.tsx` | Add product to `BLOCK_TYPE_INFO` |

