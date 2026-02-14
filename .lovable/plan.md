

# Add Phone "Order Now" Button to Review Hub

## Overview

Add a phone call button to the restaurant's public Review Hub page so visitors can tap to call and place an order. The button will appear between the Directions and Menu buttons, styled with a green call theme.

## What needs to happen

1. **Update the public view**: The `restaurant_public_info` database view currently doesn't include the `phone` column. We need to recreate it with `phone` added so the public hub page can read it.

2. **Set the phone number**: Las Islas Marias OG currently has no phone number saved. We'll set it in the database.

3. **Add the button to the hub page**: A green "Call to Place an Order" button with a phone icon will appear on the Review Hub, linking to `tel:` so it opens the phone dialer on mobile. It will only show when a phone number exists.

4. **Track taps**: Like the other buttons, tapping it will log a `phone_click` event for your analytics.

## Technical Details

### Database changes

- Recreate the `restaurant_public_info` view to include the `phone` column
- Update Las Islas Marias OG record with their phone number (you'll need to provide the number)

### Code changes

**File: `src/pages/ReviewHub.tsx`**

- Add `phone` to the `Restaurant` interface
- Add `phone` to the `fetchRestaurant` select query
- Insert a new phone button block between the Directions button and the Menu button, styled with a green background (`#16a34a`) and a phone SVG icon
- Button uses `tel:` link so it opens the native phone dialer
- Only renders when `restaurant.phone` is set

### Button design

The button will match the existing style (rounded, full-width, 700 weight) with a green background to stand out as an action-oriented CTA:

```text
+------------------------------------------+
|  [phone icon]  Call to Place an Order     |
+------------------------------------------+
```

## Question

What phone number should we use for Las Islas Marias OG?

