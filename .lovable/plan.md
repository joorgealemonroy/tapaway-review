

# Rebrand Magic Link Flow from Personal to Business

## Overview

The magic link email and password setup page currently use personal-focused language ("your TapAway profile", redirects to `/personal/dashboard`). With the B2B pivot, this should be business-focused.

## Changes

### 1. `supabase/functions/send-magic-link-email/index.ts` — Email copy

Update `generateMagicLinkEmailHtml` and `generateMagicLinkEmailText`:
- **Subject**: "Set Up Your TapAway Account" → "Set Up Your TapAway Business Account"
- **Heading**: "Set Up Your TapAway Account" → "Set Up Your Business Dashboard"
- **Body**: "access your TapAway profile" → "access your TapAway business dashboard"
- **CTA button**: "Set Up My Account" → "Access My Dashboard"
- **Plain text**: same changes mirrored
- Line 241 email subject updated accordingly

### 2. `src/pages/auth/MagicLinkVerify.tsx` — Password setup page

- **Line 115 heading**: "Welcome to TapAway!" → "Welcome to TapAway Business!"
- **Line 117 subtext**: "Create a password for" stays, but contextually fine
- **Line 129 button**: "Continue to Dashboard" (already fine)
- **Line 84 redirect**: `/personal/dashboard?welcome=true` → `/dashboard?welcome=true` (route to the business dashboard; the auth router will handle correct routing if they also have a personal account)
- **Line 153 text**: "Redirecting to your dashboard..." (already fine)

### Files

| File | Change |
|------|--------|
| `supabase/functions/send-magic-link-email/index.ts` | Update email copy and subject to business language |
| `src/pages/auth/MagicLinkVerify.tsx` | Update heading + redirect to `/dashboard` |

