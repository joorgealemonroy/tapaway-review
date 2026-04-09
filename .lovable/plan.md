

# Migrate Sugar Bloom + Fix Solo Plan Routing

## Step 1: Data Migration (Sugar Bloom Cakery & Coffee)

**Insert personal_profiles record** using data from the existing restaurant:
- `user_id`: `26dbc6b9-00d0-42a3-b975-18dd32b34ced`
- `username`: `sugarbloomcakery`
- `full_name`: Sugar Bloom Cakery & Coffee
- `email`: tempmail@tapaway.co
- `plan_type`: `monthly`
- `subscription_status`: `active`
- `profile_photo_url`: null (restaurant has no logo)
- `stripe_customer_id` / `stripe_subscription_id`: null (none on restaurant record — free promo)

**Create a Google Review link** in `personal_links`:
- `profile_id`: (the new profile's ID)
- `link_type`: `google_review`
- `label`: Review Us on Google
- `url`: `https://search.google.com/local/writereview?placeid=ChIJIxLRRSKr3IARE2zkjhRtSqQ`
- `sort_order`: 0, `is_active`: true

**Delete restaurant record** (`072da351-4dcd-4a59-9e80-510ca3cdad0d`) and any related rows in `analytics_events`, `locations`, `fulfillment_orders`, etc.

## Step 2: Edge Function Fix (`create-rep-onboarding/index.ts`)

Refactor section 5 ("Create or update restaurant") to branch on `validPlan`:

**If `solo`**: Create a `personal_profiles` record instead of a `restaurants` record, with:
- `username` from slug
- `full_name` from `businessName`
- `plan_type`: `monthly`
- `subscription_status` / `trial_ends_at` as before
- `profile_photo_url` from `logoUrl`
- Copy Stripe metadata fields

Then auto-create a `personal_links` row for the Google review URL (if `googlePlaceId` is provided), with `link_type: 'google_review'`.

**If `venue`**: Keep existing restaurant creation logic unchanged.

Update the free promo section (step 7) and Stripe checkout metadata (step 8) to use `profileId` instead of `restaurantId` when plan is solo.

## Files

| Target | Change |
|--------|--------|
| Database (insert tool) | Insert personal_profile + personal_link for Sugar Bloom; delete restaurant + related rows |
| `supabase/functions/create-rep-onboarding/index.ts` | Branch on solo vs venue: solo creates personal_profiles + google review link; venue creates restaurants |

