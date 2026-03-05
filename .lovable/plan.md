

# Revamp Personal Landing "How It Works" — Hub-First, Cards as Add-On

## Current Problem
The `PersonalHowItWorks` section frames NFC cards as the main product (Choose design → We ship → Tap to share). The actual main product is the online hub/profile where users manage all their links, collect contacts, capture emails, and see analytics. Cards should be positioned as an optional add-on.

## Plan

### 1. Replace `PersonalHowItWorks` with a new feature-showcase section
**File**: `src/components/landing/personal/PersonalHowItWorks.tsx` (rewrite)

Replace the 3-step card-centric flow with a hub-first "How It Works" that highlights the online profile as the core product:

**Step 1 — "Create your hub in minutes"**
- Icon: Layout/Globe
- Description: Add all your links, social platforms, payment apps — one beautiful page, your own URL (tapaway.co/you)

**Step 2 — "Share it anywhere"**
- Icon: Share2/QrCode
- Description: Send your link via text, add it to your bio, or upgrade to an NFC card for instant tap-to-share

**Step 3 — "Grow your network"**
- Icon: TrendingUp/BarChart
- Description: Collect contacts, capture emails and phone numbers, and track who's visiting with built-in analytics

### 2. Add a "Features" visual showcase section below How It Works
**File**: `src/components/landing/personal/PersonalFeatures.tsx` (new)

A section highlighting key hub features with mini visual previews:

- **Save Contact button** — Show a mock phone UI with the "Save Contact" button and a contact card being added. Explain visitors can save your info with one tap.
- **Collect leads** — Show a mini form with Name/Email/Phone fields. Explain owners can capture visitor info directly from their profile.
- **Analytics dashboard** — Show a screenshot/mock of the Pro analytics view (line chart, top links table). Explain Pro users see exactly who visits, what they click, and where they come from.
- **NFC Card add-on** — Small card showing the physical card as a premium add-on option. "Want to go physical? Add an NFC card for instant tap-to-share."

Each feature block: icon + heading + 1-2 sentence description + a small visual/illustration on the right (alternating left/right layout on desktop). Keep it scannable — no walls of text.

### 3. Update `PersonalFooterCTA` messaging
**File**: `src/components/landing/personal/PersonalFooterCTA.tsx`

Change from "Get your custom NFC card" to hub-first CTA:
- Headline: "Create your free hub today"
- Subtext: "Set up your personal page in minutes. Add an NFC card later if you want."
- Button: "Get Started Free" (keep linking to /personal/pricing)
- Remove shipping/package trust badges, replace with "Free forever • Pro from $6.25/mo"

### 4. Wire new section into the page
**File**: `src/pages/Personal.tsx`

Add `<PersonalFeatures />` between `<PersonalHowItWorks />` and `<PersonalUseCases />`.

### 5. Update `PersonalUseCases` subtitle
**File**: `src/components/landing/personal/PersonalUseCases.tsx`

Change subtitle from "One card. Every link. Anyone can use it." to "One hub. Every link. Anyone can use it."

### Files to create (1):
- `src/components/landing/personal/PersonalFeatures.tsx`

### Files to modify (4):
- `src/components/landing/personal/PersonalHowItWorks.tsx` — hub-first steps
- `src/components/landing/personal/PersonalFooterCTA.tsx` — hub-first CTA
- `src/components/landing/personal/PersonalUseCases.tsx` — subtitle tweak
- `src/pages/Personal.tsx` — add PersonalFeatures import

