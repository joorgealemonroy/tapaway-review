

# Fix: Link Jorge's Personal Profile to His Auth Account

## Problem

**@jorge** (jorgealemonroy@gmail.com) is being redirected to the paywall because his personal profile is linked to the **wrong auth user**.

| What | Current Value | Expected Value |
|------|---------------|----------------|
| Auth User ID | `be064e3d-3669-4338-a2df-198b97436743` | (correct) |
| Profile `user_id` | `87672793-9bcb-4cf9-b2d6-657dcaa36187` | Should be `be064e3d-3669-4338-a2df-198b97436743` |

The profile was accidentally linked to a test/throwaway account (`jfkgrjsbwbswwsogjougi@gmail.com`).

---

## Solution

This is a **data fix**, not a code fix. We need to update the personal profile's `user_id` to point to Jorge's correct auth account.

### Database Update Required

```sql
UPDATE personal_profiles 
SET user_id = 'be064e3d-3669-4338-a2df-198b97436743',
    updated_at = now()
WHERE username = 'jorge';
```

This will:
1. Link the `@jorge` profile to the correct auth user
2. Allow `jorgealemonroy@gmail.com` to log in and access their personal dashboard
3. No longer redirect to paywall since a valid personal profile will be found

---

## Why This Happened

The profile was likely created under a different auth account (possibly during testing with `jfkgrjsbwbswwsogjougi@gmail.com`), and then the email field was manually changed to `jorgealemonroy@gmail.com` without updating the `user_id` foreign key.

---

## Verification After Fix

After the update, when Jorge logs in:
1. Auth lookup returns user ID `be064e3d-...`
2. Personal profile query finds `@jorge` profile (now linked correctly)
3. Routing goes to `/personal/dashboard` instead of `/paywall`

