

# Fix: Instagram link not showing on Las Islas Marias OG profile

## Root cause

The Instagram value stored in the database for **Las Islas Marias OG** is just `Islasmariaog64` (a bare handle). The ReviewHub page uses a `isSafeUrl()` check that requires a full URL starting with `https://`. Since the bare handle fails that check, the Instagram button is hidden entirely.

## Fix

Update the database value from `Islasmariaog64` to the proper Instagram URL format:

```
https://instagram.com/Islasmariaog64
```

This is a one-line database update -- no code changes required.

## Technical details

| Item | Detail |
|------|--------|
| Restaurant | Las Islas Marias OG (id: `1d83b669-e326-4231-a8d1-686630915073`, slug: `islasmarias`) |
| Current value | `Islasmariaog64` |
| Corrected value | `https://instagram.com/Islasmariaog64` |
| Why it's hidden | `isSafeUrl()` in `ReviewHub.tsx` rejects any string that isn't a valid `http:` or `https:` URL |

