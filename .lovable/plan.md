

# Clarify OAuth User Flow — Name + Username Always Editable

## Current State
The `IdentityStep` already shows both the **Name** and **Username** fields for OAuth users, and both are fully editable. The name is pre-filled from the OAuth provider but not locked. This is correct behavior.

## Issue
The green banner shown to OAuth users reads:
> "Signed in — just pick a username to continue"

This implies only the username matters, potentially causing users to skip reviewing/editing their name.

## Fix

**File: `src/components/personal/signup/IdentityStep.tsx`** (line 262)

Update the banner text to acknowledge both fields:

```
Before: "Signed in — just pick a username to continue"
After:  "Signed in — confirm your name and pick a username"
```

Single line change. Everything else (editable name field, username field, validation) is already working correctly.

