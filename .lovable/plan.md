## Remove phone icon from VIP Text List drawer

In `src/components/restaurant/RestaurantSmsOptInDrawer.tsx`, remove the circular phone-icon badge that appears above the "Join our VIP Text List" headline in both the mobile drawer and desktop dialog views.

### Changes
- Delete the `<div>` wrapper containing the `<Smartphone />` icon in both the `DrawerHeader` (lines 130–132) and `DialogHeader` (lines 146–148).
- Remove the now-unused `Smartphone` import from `lucide-react` (line 11).

The headline, description, form fields, and submit button remain unchanged.