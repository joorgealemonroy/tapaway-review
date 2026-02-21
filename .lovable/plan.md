

# Enterprise-Grade Legal Framework for TapAway

## Overview

This plan creates a complete, production-ready legal framework covering all 15 document areas you listed, plus additional protections. Some content already exists in the current Terms, Privacy, and Refund pages -- those will be significantly expanded and restructured. Several entirely new pages will be created.

---

## Current State

| Document | Status |
|----------|--------|
| Terms of Service | Exists -- needs expansion (force majeure, export compliance, DPA reference, personal users) |
| Privacy Policy | Exists -- needs expansion (cookie detail, DPA reference, personal profile data) |
| Refund Policy | Exists -- comprehensive, minor updates only |
| Acceptable Use Policy | Missing -- new page |
| Affiliate & Referral Terms | Missing -- new page |
| NFC Product Disclaimer | Missing -- new page |
| AI Disclaimer | Partially in Terms Section 12 -- needs standalone page (business only) |
| DMCA Policy | Missing -- new page |
| Cookie & Analytics Policy | Partially in Privacy Section 8 -- needs standalone page |
| Data Processing Addendum | Missing -- new page |

Clauses like Limitation of Liability, Indemnification, Arbitration, Governing Law, and Severability already exist in the Terms but will be updated to match the 12-month liability cap and additional protections.

---

## What Will Be Created or Modified

### 1. Terms of Service (UPDATE -- `src/pages/Terms.tsx`)
Expand existing 25-section document to include:
- Updated eligibility to cover both individuals AND businesses (not just business owners)
- Personal hub/profile hosting terms (tapaway.co/username)
- Force majeure clause (new section)
- Export compliance clause (new section)
- Automatic renewal disclosure (strengthen existing Section 7)
- Reference to all new standalone policy pages
- Liability cap changed from "most recent billing cycle" to "amount paid in last 12 months"
- Updated "Last Updated" date to February 2026
- Reference to DPA, DMCA, Acceptable Use, Affiliate Terms, Cookie Policy

### 2. Privacy Policy (UPDATE -- `src/pages/Privacy.tsx`)
Expand to include:
- Personal profile data collection (username, bio, avatar, social links, contact card info)
- Affiliate tracking data (referral codes, IP for abuse detection)
- Email lead capture data (from personal profiles with email collection enabled)
- Strengthen GDPR section with legal basis for processing
- Add DPA reference for business/enterprise users
- Add cross-border data transfer mechanisms (Standard Contractual Clauses mention)
- Updated "Last Updated" date

### 3. Refund & Subscription Policy (MINOR UPDATE -- `src/pages/Refund.tsx`)
- Add explicit automatic renewal disclosure section
- Add personal plan (free tier) clarification
- Updated "Last Updated" date

### 4. Acceptable Use Policy (NEW -- `src/pages/AcceptableUse.tsx`)
Standalone page covering:
- Prohibited content on personal profiles and business hubs
- No spam, malware, phishing, or illegal content
- No impersonation or identity fraud
- No harassment or hate speech via profiles
- No copyright/trademark infringement in uploaded content
- No automated scraping or bot access
- Enforcement actions (warning, suspension, termination)
- Reporting mechanism (tap@tapaway.co)

### 5. Affiliate & Referral Terms (NEW -- `src/pages/AffiliateTerms.tsx`)
Standalone page covering:
- Eligibility requirements
- Commission structure and payout terms
- Prohibited affiliate practices (self-referrals, fake accounts, spam, misleading ads)
- Abuse detection and consequences (ties into existing abuse flag system)
- IP tracking disclosure for fraud prevention
- TapAway's right to modify commission rates
- TapAway's right to withhold or claw back fraudulent commissions
- Termination of affiliate status
- No guarantee of earnings
- Tax responsibility (1099 reporting)
- Relationship is independent contractor, not employment

### 6. Physical NFC Product Disclaimer (NEW -- `src/pages/NFCDisclaimer.tsx`)
Standalone page covering:
- NFC cards are optional -- hub/profile works without a physical card
- Device compatibility not guaranteed
- Environmental wear and lifespan disclaimer
- No warranty on physical durability
- Shipping and delivery disclaimers
- Customer input error responsibility
- Lost/stolen/damaged after delivery
- Card replacement policy (defective only, at TapAway's discretion)
- QR codes function independently of NFC

### 7. AI Disclaimer (NEW -- `src/pages/AIDisclaimer.tsx`)
Standalone page (business product only) covering:
- AI Coach provides suggestions, not professional advice
- No guarantee of accuracy, completeness, or suitability
- Not legal, financial, medical, or professional consulting
- User responsible for reviewing all AI outputs before use
- AI review replies must be reviewed before posting
- AI insights based on available data -- not predictive
- No liability for business decisions based on AI suggestions
- AI models may change without notice
- Data used for AI is covered under Privacy Policy

### 8. Limitation of Liability & Indemnification (UPDATE in Terms)
Already exists in Terms Sections 17-18. Will be updated:
- Cap liability at amount paid in last **12 months** (currently says "most recent billing cycle")
- Add explicit "no guarantee of increased reviews or business growth" language
- Add explicit lost profits disclaimer
- Add user-generated content liability disclaimer

### 9. Arbitration + Class Action Waiver (NO CHANGE needed)
Already comprehensive in Terms Section 19. Will add small claims court exception and 30-day opt-out window for new users (industry standard, strengthens enforceability).

### 10. Data Processing Addendum (NEW -- `src/pages/DPA.tsx`)
For business/enterprise compliance:
- Definitions (Controller, Processor, Sub-processor)
- Scope of processing
- TapAway as data processor
- Security measures
- Sub-processor list (Stripe, cloud hosting)
- Data breach notification (72 hours)
- Data subject requests handling
- Data deletion upon termination
- Audit rights (limited)
- Standard Contractual Clauses reference for international transfers

### 11. DMCA Policy (NEW -- `src/pages/DMCA.tsx`)
- Designated DMCA agent (tap@tapaway.co)
- How to file a takedown notice (required elements per 17 USC 512)
- Counter-notification process
- Repeat infringer policy
- Good faith requirement

### 12. Cookie & Analytics Policy (NEW -- `src/pages/CookiePolicy.tsx`)
- Types of cookies used (strictly necessary only)
- Session cookies for authentication
- UI preference cookies (theme, sidebar state)
- Analytics tracking via first-party analytics (not third-party)
- No advertising or third-party tracking cookies
- How to manage cookies in browser settings
- Why no cookie consent banner is shown (strictly necessary exemption)

### 13. Automatic Renewal Disclosure (UPDATE in Terms + Refund)
Strengthen existing language in Terms Section 7 and Refund Section 10:
- Clear disclosure that subscriptions auto-renew
- How to cancel before renewal
- Billing portal access instructions
- Price change notification (30 days)
- California Auto-Renewal Law (ARL) compliance language

### 14. Governing Law (NO CHANGE needed)
Already in Terms Section 20 -- California law, California courts.

### 15. Severability (NO CHANGE needed)
Already in Terms Section 23.

---

## Additional Protections Being Added (Not in Original Request)

- **Force Majeure Clause** -- Added to Terms (pandemics, natural disasters, government actions, infrastructure failures)
- **Export Compliance** -- Added to Terms (U.S. export control laws, sanctions compliance)
- **Small Claims Court Exception** -- Added to arbitration clause (strengthens enforceability)
- **30-Day Arbitration Opt-Out Window** -- For new users (industry standard for enforceability)
- **Anti-Money Laundering Notice** -- Brief statement in Terms
- **California Auto-Renewal Law (ARL)** compliance language
- **Electronic Signatures Consent** -- Browsewrap binding reinforcement

---

## Routing Changes (`src/App.tsx`)

New routes to add:
- `/acceptable-use` -- AcceptableUse page
- `/affiliate-terms` -- AffiliateTerms page
- `/nfc-disclaimer` -- NFCDisclaimer page
- `/ai-disclaimer` -- AIDisclaimer page
- `/dmca` -- DMCA page
- `/cookie-policy` -- CookiePolicy page
- `/dpa` -- DPA page

All new pages will be lazy-loaded under the "Legal pages" comment block.

---

## Footer & Link Placement Checklist

After implementation, the following links must appear in these locations:

| Location | Links Required |
|----------|---------------|
| **Landing page footer** (Personal `/` and Business `/business`) | Terms, Privacy, Refund, Cookie Policy |
| **Mobile nav** (`MobileNav.tsx`) | Terms, Privacy, Refund |
| **Signup flow** (`AffiliatePaywall.tsx`, `Paywall.tsx`, `CheckoutStep.tsx`) | Terms, Privacy (already present) -- add Refund link |
| **Personal dashboard** footer/settings | Terms, Privacy |
| **Business dashboard** settings | Terms, Privacy |
| **Affiliate dashboard** (`AffiliateDashboard.tsx`) | Affiliate Terms link (new) |
| **Checkout/payment pages** | Terms, Privacy, Refund, Auto-Renewal Disclosure |
| **AI Coach tab** (business dashboard) | AI Disclaimer link |
| **NFC card order flow** | NFC Disclaimer link |

---

## Technical Approach

- All new pages follow the exact same layout pattern as existing Terms/Privacy/Refund pages (sticky nav with TapAway logo, back button, container with prose styling)
- All new pages lazy-loaded in App.tsx
- Shared nav component pattern reused (no new components needed)
- Footer links updated in `Personal.tsx`, `Index.tsx`, and `MobileNav.tsx`
- No database changes required
- No edge function changes required

---

## File Summary

| Action | File |
|--------|------|
| UPDATE | `src/pages/Terms.tsx` |
| UPDATE | `src/pages/Privacy.tsx` |
| UPDATE | `src/pages/Refund.tsx` |
| CREATE | `src/pages/AcceptableUse.tsx` |
| CREATE | `src/pages/AffiliateTerms.tsx` |
| CREATE | `src/pages/NFCDisclaimer.tsx` |
| CREATE | `src/pages/AIDisclaimer.tsx` |
| CREATE | `src/pages/DMCA.tsx` |
| CREATE | `src/pages/CookiePolicy.tsx` |
| CREATE | `src/pages/DPA.tsx` |
| UPDATE | `src/App.tsx` (add 7 new routes) |
| UPDATE | `src/pages/Personal.tsx` (footer links) |
| UPDATE | `src/pages/Index.tsx` (footer links) |
| UPDATE | `src/components/landing/MobileNav.tsx` (nav links) |

