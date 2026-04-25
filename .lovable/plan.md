## Goal

Temporarily lock down mass SMS sending in the dashboard while A2P 10DLC carrier approval is pending. Keep all metrics and subscriber capture flowing.

## Changes — single file

`src/components/personal/SmsMarketingTab.tsx`

### 1. Pending-approval banner

Add at the top of the returned JSX (above the Audience card):

```tsx
<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-4 text-sm text-amber-900 dark:text-amber-200">
  🚧 SMS Marketing is currently pending carrier approval. Mass texting will be unlocked in a few days!
</div>
```

Uses amber/yellow alert tone, dark-mode aware.

### 2. Disable the Send button

Add a single feature flag at the top of the component body:

```ts
const SENDING_LOCKED = true;
```

- Force `disabled={true}` on the Send button (override `canSend`).
- Replace button label with **"Coming Soon"** (drop the spinner / Send icon while locked).
- Also disable the textarea so users don't waste time composing.
- Keep the `AlertDialog` confirmation logic untouched — it just can't be opened while locked.

When carrier approval lands, flip `SENDING_LOCKED = false` to re-enable everything.

### 3. Keep metrics & subscriber capture intact

- Audience card (Total SMS Subscribers) — unchanged.
- Recent campaigns list — unchanged.
- `personal_email_captures` opt-in flow on the public profile — untouched.
- `send-mass-sms` edge function — untouched (just unreachable from the UI).

## Out of scope

- No backend / edge function changes.
- No DB changes.
- No copy changes elsewhere in the app.
