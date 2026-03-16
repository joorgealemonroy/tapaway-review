

# Welcome Email Redesign

## Changes

**File: `supabase/functions/send-personal-welcome-emails/index.ts`**

### 1. Update subject line (line 374)
Change from `"Welcome to TapAway 👋 Your card is being prepared"` to `"Welcome to TapAway! 👋 Your new hub is live."`

### 2. Rewrite `generateUserWelcomeEmail` (lines 193-323)
Replace the entire user welcome email body:

- **Header**: Keep logo + "Welcome to TapAway 👋"
- **Intro paragraph**: Remove NFC card mention. Replace with: "Your personal profile is officially live and ready to be shared with the world. You now have a single, beautiful hub for all your content, links, and socials."
- **Your Link box**: Keep the grey box with `tapaway.co/username` and the "Edit Your Profile" button
- **Replace "What happens next?" section** with "How to use TapAway" containing 3 tips:
  1. 📱 **Link in Bio** — Add your TapAway URL to Instagram, TikTok, and X bios
  2. ✉️ **Email Signature** — Drop your link at the bottom of your emails
  3. 🤝 **QR Code Sharing** — Use the QR code in your dashboard for networking events
- **Add NFC Card upsell** below a divider: soft copy about tapping to share + a "Shop Custom NFC Cards" button linking to `${FRONTEND_URL}/personal/pricing`

### 3. Update internal notification subject (line 357)
Change from `"New TapAway Personal Card Order"` to `"New TapAway Personal Signup"` (no card is being ordered automatically)

### 4. Deploy
Redeploy the `send-personal-welcome-emails` edge function after changes.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-personal-welcome-emails/index.ts` | Rewrite welcome email body, subject, and internal subject |

