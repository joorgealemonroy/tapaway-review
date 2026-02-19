

# Simplify NFC Activation to a Single URL

## What changes

Instead of each card having its own unique URL (`/c/AB12CD`), all NFC cards will be programmed with the same URL:

```
tapaway.co/setup
```

The user then enters their card's **public code** manually on that page (along with the claim code). This is simpler for manufacturing since every card gets the same NFC link.

## Changes

### 1. Route update (`src/App.tsx`)
- Change `/c/:code` to `/setup`
- Update the lazy import reference

### 2. Rewrite `CardResolver.tsx`
- Remove the URL param-based card lookup
- Instead, show a form where the user types in their **card code** (the `public_code` printed on the card)
- Once entered, look up the card and either redirect (if claimed) or proceed to activation
- Essentially merge the "card code input" into the first step of the flow

### 3. Update `CardActivation.tsx`
- Add a new first step: "Enter your card code" (the `public_code`)
- Flow becomes: **Card Code** -> **Claim Code** -> **Auth** -> **Username** -> **Done**
- The card code input is a simple text field (6 chars, uppercase alphanumeric)

### 4. Remove "c" from reserved usernames (`src/lib/reservedUsernames.ts`)
- Add "setup" instead

### 5. No edge function changes needed
- The `claim-nfc-card` function already accepts `publicCode` in the body, so it works the same way

## Updated User Flow

```text
All NFC cards programmed with: tapaway.co/setup
                |
                v
        User lands on /setup
                |
                v
        Enter card code (public_code from card)
                |
                v
        Card found? ──No──> "Card not found"
                |
               Yes
                |
        Already claimed? ──Yes──> Redirect to /username
                |
               No
                |
        Enter claim code (secret from packaging)
                |
                v
        Login / Create account
                |
                v
        Pick username
                |
                v
        Card activated!
```

## Files to modify

| File | Change |
|------|--------|
| `src/App.tsx` | Change route from `/c/:code` to `/setup` |
| `src/pages/CardResolver.tsx` | Remove URL param logic; show card code input form instead |
| `src/pages/CardActivation.tsx` | Add card code as first step before claim code |
| `src/lib/reservedUsernames.ts` | Replace "c" with "setup" |
