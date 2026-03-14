

# Add Rate Limiting to API Routes

## Current State

Only 2 of ~20 public edge functions have rate limiting (`track-event`, `send-custom-otp`). The rest — including sensitive endpoints like `send-auth-email`, `set-user-password`, `claim-card`, `create-checkout-session` — are completely unprotected from abuse.

## Approach

### A. Create shared rate limiter — `supabase/functions/_shared/rateLimit.ts`

Reusable in-memory rate limiter (same pattern as `track-event` but extracted):

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean { ... }

export function getRateLimitKey(req: Request, suffix: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  return `${ip}:${suffix}`;
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response { ... }
```

### B. Apply rate limiting to public endpoints

Each function gets a one-line import + 3-line check near the top. Limits tuned per endpoint:

| Function | Limit | Window | Key |
|----------|-------|--------|-----|
| `send-auth-email` | 5/10min | IP+email | Prevents email spam |
| `set-user-password` | 5/15min | IP | Brute force protection |
| `claim-card` | 10/hr | IP | Card claiming abuse |
| `create-checkout-session` | 10/hr | IP | Checkout spam |
| `create-rep-checkout` | 10/hr | IP | Checkout spam |
| `create-product-checkout` | 10/hr | IP | Checkout spam |
| `verify-custom-otp` | 10/15min | IP+email | OTP brute force |
| `verify-rep-setup-token` | 10/15min | IP | Token brute force |
| `verify-magic-link` | 10/15min | IP | Token brute force |
| `verify-personal-upgrade` | 10/hr | IP | Verification spam |
| `lookup-stripe-session` | 20/hr | IP | Lookup abuse |
| `check-affiliate-abuse` | 20/hr | IP | Abuse check spam |
| `serve-og-profile` | 60/min | IP | Scraping protection |
| `download-product` | 20/hr | IP | Download abuse |
| `restore-premium-content` | 10/hr | IP | Restore abuse |
| `send-card-approval` | 10/hr | IP | Email spam |
| `send-personal-welcome-emails` | 10/hr | IP | Email spam |

Skip: `stripe-webhook` (Stripe manages its own), `send-test-emails` (admin-only by logic).

### C. Refactor `track-event` to use shared utility

Replace its inline rate limiter with the shared import.

### Files changed

- **New**: `supabase/functions/_shared/rateLimit.ts`
- **Modified**: 18 edge function `index.ts` files (add ~5 lines each)

