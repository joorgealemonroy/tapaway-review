

# Add Google & Apple OAuth to Card Activation Page

## Problem
When users land on `/c/:code` and tap "Activate Now", they only see an email + OTP flow. There are no OAuth options (Google or Apple), even though both are supported throughout the rest of the app via `lovable.auth.signInWithOAuth`.

## Solution
Add "Continue with Google" and "Continue with Apple" buttons to the email step in `CardResolver.tsx`. After OAuth completes, the user is redirected back to `/c/{code}` where the existing `resolveCard` logic detects the authenticated user and either claims the card or sends them to signup.

## Changes

### `src/pages/CardResolver.tsx`

**1. Add imports:**
```typescript
import { lovable } from "@/integrations/lovable/index";
```

**2. Add state:**
```typescript
const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
```

**3. Add OAuth handler:**
```typescript
const handleOAuthSignIn = async (provider: "google" | "apple") => {
  setOauthLoading(provider);
  try {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/c/${publicCode}`,
    });
    if (error) {
      toast.error(`Sign-in failed`);
      setOauthLoading(null);
    }
  } catch {
    toast.error(`Sign-in failed`);
    setOauthLoading(null);
  }
};
```

**4. Update the email step UI** — add OAuth buttons above the email input with an "or" divider:

```text
┌──────────────────────────────┐
│  [G] Continue with Google    │
│  [] Continue with Apple     │
├──────────────────────────────┤
│         ── or ──             │
├──────────────────────────────┤
│  [you@email.com           ]  │
│  [      Send Code          ] │
│  ← Back to examples         │
└──────────────────────────────┘
```

- Google button: outline variant with Google "G" SVG icon
- Apple button: outline variant with Apple logo SVG icon
- Divider: horizontal lines with "or" text in muted color between OAuth and email sections
- Both buttons show a spinner when loading and disable during OAuth redirect

### How It Works
1. User taps "Activate Now" → sees Google/Apple buttons + email input
2. If they click Google/Apple → OAuth redirect with `redirect_uri` back to `/c/{code}`
3. On return, `resolveCard` runs in `useEffect` → detects authenticated user → either claims card (if profile exists) or redirects to `/personal/signup?card={code}`
4. If they use email → existing OTP flow unchanged

### Files Modified
- `src/pages/CardResolver.tsx` — Add OAuth buttons, handler, loading state, and "or" divider to the email step

