

# Improve Hero CTA Buttons and Floating Badge

## Changes (single file: `src/components/landing/personal/PersonalHero.tsx`)

### 1. Replace "Real profile" floating badge

The current floating badge says "Real profile" with a sparkle emoji -- it's vague and doesn't drive action. Replace it with something that builds credibility and curiosity:

- Change to **"Live example"** with a green pulse dot (like a "live" indicator), making it feel dynamic and real
- Alternative text: "See it live" with a small external link icon

### 2. Rework the CTA buttons

Current state: Single "Get Your TapAway" button with an arrow icon.

New state -- two buttons side by side:

- **Primary CTA**: Change "Get Your TapAway" to **"Create Yours Free"** -- this is a stronger funnel opener because it removes friction (implies free, action-oriented "create yours")
- **Secondary CTA**: Add a new outline-style button **"View a Real Profile"** that links to `https://tapaway.co/jorge` in a new tab with an ExternalLink icon -- this lets skeptical visitors verify it's real before signing up

Button layout:
- On mobile: stack full-width (`flex-col w-full`)
- On sm+: side by side (`sm:flex-row sm:w-auto`)

### 3. Update trust line

Change "Free plan available - Pro from $6.25/mo" to **"Free forever - upgrade anytime"** for a cleaner, lower-friction message.

### Technical details

- Primary button keeps the existing dark style (`bg-foreground text-background`) with the same Link to `/personal/pricing`
- Secondary button uses outline styling: `border border-border bg-transparent text-foreground hover:bg-muted` as an `<a>` tag with `target="_blank"`
- Floating badge: replace sparkle emoji + "Real profile" with a small green dot (`w-2 h-2 rounded-full bg-green-500 animate-pulse`) + "Live example" text
- No new dependencies or files needed

