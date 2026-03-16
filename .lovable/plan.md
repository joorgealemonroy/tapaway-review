

# Pre-fill Social Link Values with Friendly Placeholders

## Change

In `src/pages/personal/PersonalSignup.tsx` (~line 197), replace `value: ""` with a helper that returns a friendly placeholder based on link type.

Add a small utility function:

```typescript
function getFriendlyValue(type: string): string {
  const social = ["instagram", "tiktok", "x", "youtube", "linkedin", "discord", "snapchat", "threads", "twitch", "pinterest", "spotify"];
  if (social.includes(type)) return "@yourname";
  if (type === "email") return "you@email.com";
  if (type === "phone") return "+1 (555) 000-0000";
  if (type === "website") return "yoursite.com";
  return "";
}
```

Then update line 197:
```typescript
value: getFriendlyValue(l.type),
```

Single file edit: `src/pages/personal/PersonalSignup.tsx`

