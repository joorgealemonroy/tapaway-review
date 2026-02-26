

# Center Layout + Add Bio for adrianlasislas

## What Needs to Happen

A single database update on the `personal_profiles` table for username `adrianlasislas`:

- Set `pfp_position` from `"left"` to `"center"` — this centers the username and text in the banner layout (the code already handles this)
- Set `bio` to `"vendo mariscos"`

No code changes are needed. The profile page already renders the bio when it exists and centers content when `pfp_position === "center"`.

## Technical Detail

SQL to execute:
```sql
UPDATE personal_profiles
SET pfp_position = 'center', bio = 'vendo mariscos'
WHERE username = 'adrianlasislas';
```

