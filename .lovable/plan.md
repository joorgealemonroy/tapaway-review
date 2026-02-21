

# Update Affiliate Referral Links

## What's changing
The affiliate referral link currently sends people directly to the signup form (`tapaway.co/personal/signup?ref=CODE`). Instead, it should send them to the full landing page experience (`tapaway.co/?ref=CODE`) — the page with the animated card, hub showcase, layout templates, and "Create My Hub" buttons. The tracking still works the same because the landing page already stores the `ref` code and passes it through to the signup wizard.

## Technical changes

**File:** `src/pages/affiliate/AffiliateDashboard.tsx`

1. Update the `copyLink` function URL from `/personal/signup?ref=` to `/?ref=`
2. Update the displayed link text in the UI from `tapaway.co/personal/signup?ref=...` to `tapaway.co/?ref=...`

Both are one-line changes. No tracking logic needs to change — the `AffiliateOnboarding` component already saves the ref code to `sessionStorage` and passes it to the signup wizard via the navigate call.

