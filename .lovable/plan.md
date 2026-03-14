

# Sanitize All User Inputs — Security Hardening

## Problem Summary

After auditing the codebase, I found several categories of vulnerabilities:

### 1. HTML Injection in Email Templates (HIGH — data stealing risk)
Multiple edge functions interpolate raw user input into HTML email bodies without escaping. An attacker could inject `<script>` tags or malicious HTML via form fields (name, business name, description, card headline, address fields, etc.):
- `support-notification` — name, businessName, email, phone, location, description
- `send-demo-request-notification` — fullName, address fields
- `send-card-approval` — fullName, username, email, cardHeadline
- `send-cards-shipping-email`, `send-personal-welcome-emails`, `send-auth-email`, `send-magic-link-email`, etc.

### 2. `javascript:` URL injection (HIGH — XSS risk)
Profile links (`link.url`), button blocks (`content.url`), and image link URLs (`content.linkUrl`) are rendered directly in `<a href={...}>`. A malicious user could set a link URL to `javascript:alert(document.cookie)` and anyone viewing the profile would be vulnerable.

### 3. YouTube videoId injection (MEDIUM)
The YouTube block renders `src={https://www.youtube.com/embed/${videoId}}` — a crafted videoId could break out of the URL.

### 4. Missing input length limits on client forms (LOW-MEDIUM)
Support form, rep application, onboarding — no maxLength on inputs, allowing massive payloads.

## Plan

### A. Create a shared HTML escape utility for edge functions

Create `supabase/functions/_shared/sanitize.ts` with:
- `escapeHtml(str)` — escapes `&`, `<`, `>`, `"`, `'` characters
- `sanitizeText(str, maxLen)` — trims, applies length limit, escapes HTML

### B. Apply HTML escaping in all email-sending edge functions

Update these functions to escape all user-provided values before interpolating into HTML:
- `support-notification/index.ts` (name, businessName, email, phone, location, description, cardNeeds, techIssues)
- `send-demo-request-notification/index.ts` (fullName, address fields)
- `send-card-approval/index.ts` (fullName, username, email, cardHeadline)
- `send-cards-shipping-email/index.ts`
- `send-personal-welcome-emails/index.ts`
- `send-auth-email/index.ts`
- `send-magic-link-email/index.ts`
- `send-payout-notification/index.ts`
- `send-test-welcome-email/index.ts`
- `send-weekly-report/index.ts`

### C. Create a URL sanitizer utility for the frontend

Create `src/lib/sanitizeUrl.ts`:
- `sanitizeUrl(url)` — returns `url` only if it starts with `http://`, `https://`, `mailto:`, `tel:`, or `sms:`. Returns `#` for anything else (blocks `javascript:`, `data:`, `vbscript:`, etc.)

### D. Apply URL sanitization on all user-controlled `<a href>` renders

Update these files to use `sanitizeUrl()`:
- `src/pages/personal/PersonalProfilePage.tsx` — all link renders + button block + image linkUrl
- `src/components/personal/ProfilePreviewRenderer.tsx` — all link renders
- `src/pages/personal/PersonalProfile.tsx` — link renders

### E. Sanitize YouTube videoId

In both `PersonalProfilePage.tsx` and `ProfilePreviewRenderer.tsx`, validate that `videoId` matches `/^[a-zA-Z0-9_-]{11}$/` before rendering the iframe.

### F. Add maxLength to client-side form inputs

Add `maxLength` attributes to text inputs in:
- `src/pages/Support.tsx` — name (100), business (100), email (255), phone (20), description (2000)
- `src/pages/rep/RepApply.tsx` — name (100), email (255), phone (20), message (1000)
- `src/pages/Onboarding.tsx` — business name (100), city (100)

### G. Server-side input length validation in edge functions

Add length checks in the most critical edge functions:
- `support-notification` — reject if any field > 2000 chars
- `send-demo-request-notification` — reject if any field > 500 chars
- `create-personal-account` — reject if username > 30, fullName > 100

This is a broad change touching ~15+ files but each change is small and mechanical (wrap values in `escapeHtml()` or `sanitizeUrl()`).

