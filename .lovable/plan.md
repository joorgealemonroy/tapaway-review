

# Fix: Update @sugarbloomcakery Email to eric92.aguilar@yahoo.com

## What's happening

There are **two separate auth accounts** for this person:

1. **Personal profile (@sugarbloomcakery)** — auth user `26dbc6b9...`, email: `tempmail@tapaway.co`
2. **Business account ("My Restaurant")** — auth user `31e9c4ef...`, email: `eric92.aguilar@yahoo.com`

The email update fails because `eric92.aguilar@yahoo.com` is already used by auth account #2.

## Proposed fix

Since the business account appears to be an unused/default restaurant ("My Restaurant" with no real data), we need to:

1. **Delete the orphan business account**: Remove the restaurant record `44635caf...` and then delete auth user `31e9c4ef...` using the admin API — this frees up the email address.

2. **Retry the email update**: Once the email is freed, the existing admin email update flow will work to change @sugarbloomcakery's email from `tempmail@tapaway.co` to `eric92.aguilar@yahoo.com`.

Both steps will be done via an edge function call using the service role key (admin-level operation).

## Before proceeding

Please confirm:
- Is it safe to **delete** the business account "My Restaurant" (owner: `eric92.aguilar@yahoo.com`)? It appears to be a generic/default name with no real content.

## Files Modified

No code changes needed — this is a data cleanup operation using existing edge functions and direct admin API calls.

