

# Add Full Menu for Las Islas Marias OG

## Overview

Las Islas Marias OG (slug: `islasmarias`, ID: `1d83b669-e326-4231-a8d1-686630915073`) currently has zero menu sections and zero menu items. This plan inserts the entire menu provided, organized into 12 sections with matching emojis.

## Menu Sections (in order)

| # | Section Name | Items |
|---|-------------|-------|
| 0 | 🥤 Bebidas - Drinks | 16 |
| 1 | 🌮 Tacos y Empanadas | 3 |
| 2 | 🍲 Caldos | 7 |
| 3 | 🐙 Especialidades de la Casa | 5 |
| 4 | 🦐 Botanas y Ensaladas | 10 |
| 5 | 🍤 Platillos - Seafood Plates | 8 |
| 6 | 🍸 Cocteles - Estilo Nayarit | 7 |
| 7 | 🥑 Tostadas | 8 |
| 8 | 🐟 Ceviches y Ensaladas | 11 |
| 9 | 👶 Kids | 2 |
| 10 | 🧀 Extras | 4 |
| 11 | 🍰 Postres | 2 |

**Total: 83 unique items across 12 sections** -- no duplicates.

## Implementation

A single database migration will:

1. Insert 12 rows into `menu_sections` with `restaurant_id`, `name`, and `sort_order`
2. Insert 83 rows into `menu_items` with `section_id` (referencing the new sections), `name`, `description`, `price`, and `sort_order`

Items with multiple sizes (e.g., Med/Lg) will show pricing in the `price` field as "Med $4 / Lg $5". Items with no listed price will show "Market Price" or "Price varies".

## Technical details

- **Tables used**: `menu_sections`, `menu_items`
- **Restaurant ID**: `1d83b669-e326-4231-a8d1-686630915073`
- **No code changes needed** -- the existing menu rendering in `ReviewHub.tsx` / `MenuTab.tsx` already reads from these tables
- Migration uses CTEs with `INSERT ... RETURNING id` to chain section creation with item insertion in a single atomic SQL statement

