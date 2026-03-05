

# Unclaim Card 6CQ9P4

The card `6CQ9P4` is currently claimed by user `a93f92b7` (tap@tapaway.co) with destination `profile → socials`.

There is a database trigger `prevent_card_reclaim` that blocks changing status from `claimed` back to `unclaimed`. We need to temporarily disable it, reset the card, then re-enable it.

## Database Migration

Run a single SQL migration that:
1. Drops the trigger temporarily
2. Resets the card: `status = 'unclaimed'`, `owner_user_id = NULL`, `destination_type = 'profile'`, `destination_value = NULL`, `claimed_at = NULL`
3. Re-creates the trigger

No code file changes needed.

