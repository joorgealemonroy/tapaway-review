# TapAway Test Accounts

This document describes the test account system for TapAway.

## Overview

Test accounts are special accounts that:
- Bypass Stripe/paywall completely
- Have `subscription_status = 'active'` 
- Are pre-configured with 2,500 taps (AI Coach unlocked)
- Show a test account banner in the UI
- Are clearly marked "(TEST)" in admin dropdown

## Test Account Credentials

All test accounts use the same password: **`TapawayTest123!`**

| Email | Name | Restaurant | Slug |
|-------|------|------------|------|
| test-owner1@tapaway.co | Test Owner 1 | Test Restaurant 1 (TEST) | test-restaurant-1 |
| test-owner2@tapaway.co | Test Owner 2 | Test Restaurant 2 (TEST) | test-restaurant-2 |
| test-owner3@tapaway.co | Test Owner 3 | Test Restaurant 3 (TEST) | test-restaurant-3 |

## Seeding Test Accounts

### Option 1: Via Edge Function (Recommended for Production)

Call the `seed-test-accounts` edge function as an admin:

```bash
curl -X POST https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/seed-test-accounts \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

This will:
- Create auth users if they don't exist
- Create restaurant records with test flag
- Set up proper subscription status
- Return a summary of created accounts

### Option 2: Manual SQL (Development)

For local development or direct database access:

```sql
-- Note: You'll need to create auth.users manually first via Supabase dashboard
-- Then create restaurant records:

INSERT INTO public.restaurants (
  owner_id,
  restaurant_name,
  custom_slug,
  owner_name,
  subscription_status,
  plan_type,
  is_demo_account,
  greeting_name,
  total_taps,
  header_title,
  header_subtitle,
  menu_title
) VALUES
  (
    'USER_ID_HERE',  -- Replace with actual auth.users.id
    'Test Restaurant 1 (TEST)',
    'test-restaurant-1',
    'Test Owner 1',
    'active',
    'test',
    true,
    'Test Owner 1',
    2500,
    'How was your visit?',
    'We would love to hear about your experience!',
    'Our Menu'
  );
```

## How Test Accounts Work

### 1. Config File
All test account emails and metadata are defined in `src/lib/testAccounts.ts`:

```typescript
export const TEST_ACCOUNTS = [
  {
    email: "test-owner1@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 1",
    restaurantName: "Test Restaurant 1 (TEST)",
    slug: "test-restaurant-1"
  },
  // ...
];

export function isTestAccount(email?: string | null): boolean {
  if (!email) return false;
  return TEST_ACCOUNTS.some(t => t.email.toLowerCase() === email.toLowerCase());
}
```

### 2. Paywall Bypass
In `src/lib/grandfatheredUsers.ts`, test accounts are included in grandfathered users:

```typescript
export const isGrandfatheredUser = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return GRANDFATHERED_EMAILS.includes(email.toLowerCase()) || isTestAccount(email);
};
```

### 3. AI Coach Unlock
In `supabase/functions/ai-coach-insights/index.ts`, test accounts bypass the 1,000-tap requirement:

```typescript
const isTestAccount = restaurant.is_demo_account === true;
if (!isAdmin && !isTestAccount && totalTaps < 1000) {
  return locked response;
}
```

### 4. UI Indicators
- Test account banner appears at top of dashboard
- Admin dropdown shows "(TEST)" label next to test restaurants
- "Test Account Dashboard" subtitle in dashboard header

## Testing Workflow

### For Onboarding/UX Testing
1. Log in as any test account (e.g., test-owner1@tapaway.co)
2. You'll bypass paywall and land directly in dashboard
3. Test onboarding, settings, AI Coach, etc.
4. Data is isolated to that test account

### For Admin Testing
1. Log in as tap@tapaway.co (super admin)
2. Switch to a test restaurant in admin mode
3. Test features across multiple test accounts
4. Test accounts are clearly labeled "(TEST)"

## Removing or Adding Test Accounts

To add/remove test accounts:

1. Edit `src/lib/testAccounts.ts` to add/remove entries
2. Re-run the seed function or manually create auth users + restaurants
3. Changes take effect immediately (no deployment needed for email checks)

To disable all test accounts without deleting:
- Comment out the `|| isTestAccount(email)` logic in grandfatheredUsers.ts
- This will make them behave like normal users

## Security Notes

⚠️ **Important:**
- Never commit actual test account passwords to the repo (use environment variables in production)
- Test accounts use `is_demo_account = true` flag in database
- Test accounts should only be used in development/staging
- For production testing, use separate testing databases or delete test accounts before launch

## Acceptance Checklist

- [ ] Can log in as test-owner1@tapaway.co
- [ ] Can log in as test-owner2@tapaway.co  
- [ ] Can log in as test-owner3@tapaway.co
- [ ] Test accounts bypass Stripe/paywall
- [ ] Test accounts land in dashboard after login
- [ ] Test account banner appears in dashboard
- [ ] AI Coach is unlocked for test accounts
- [ ] Admin dropdown shows "(TEST)" label
- [ ] Test accounts have subscription_status = 'active'
- [ ] Test accounts show 2,500 taps in admin view
