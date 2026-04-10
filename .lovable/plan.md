

# Fix Consecutive Video Uploads

## Changes in `src/components/personal/BlockModal.tsx`

### 1. Reset file input safely
In `handleCollageMediaSelect`, capture the file reference first, then clear the input:
```ts
const file = e.target.files?.[0];
if (!file) return;
e.target.value = "";  // Clear AFTER capturing file ref
```

### 2. Guard `extractVideoPoster` timeout
Add a `settled` flag so the 10s timeout reject is a no-op if the promise already resolved/rejected:
```ts
let settled = false;
// In resolve: if (settled) return; settled = true; resolve(blob);
// In reject: if (settled) return; settled = true; reject(err);
// In timeout: if (!settled) { settled = true; reject(...); }
```

Only one file modified: `src/components/personal/BlockModal.tsx`

