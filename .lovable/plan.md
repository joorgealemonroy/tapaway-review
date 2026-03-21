

# Reframe MagicLinkStep as Social Scanner (with Spotify fix)

## Changes — `src/components/personal/signup/MagicLinkStep.tsx`

### 1. Replace `SUPPORTED_PLATFORMS` array (lines 27-35)
Expand to include social media domains + keep link-in-bio domains for background support. Spotify uses both `spotify.com` and `open.spotify.com`:

```ts
const SUPPORTED_PLATFORMS = [
  { name: "Instagram", domain: "instagram.com" },
  { name: "TikTok", domain: "tiktok.com" },
  { name: "YouTube", domain: "youtube.com" },
  { name: "X", domain: "x.com" },
  { name: "Twitter", domain: "twitter.com" },
  { name: "Twitch", domain: "twitch.tv" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "Spotify Web", domain: "open.spotify.com" },
  { name: "Linktree", domain: "linktr.ee" },
  { name: "Stan Store", domain: "stan.store" },
  { name: "Beacons", domain: "beacons.ai" },
  { name: "lnk.bio", domain: "lnk.bio" },
  { name: "Bio Link", domain: "bio.link" },
  { name: "Campsite", domain: "campsite.bio" },
  { name: "Hoo.be", domain: "hoo.be" },
];

const DISPLAY_PLATFORMS = ["Instagram", "TikTok", "YouTube", "X / Twitter", "Twitch", "Spotify"];
```

### 2. Badge text (line 242)
`Magic Import` → `Smart Scan`

### 3. Placeholder (line 257)
`linktr.ee/yourname` → `instagram.com/yourname`

### 4. Error message (line 273)
`We don't support that platform yet. Try Linktree, Stan Store, or Beacons.` → `We couldn't scan that link. Try pasting your Instagram, TikTok, or YouTube URL.`

### 5. "Works with" badges (lines 278-287)
Replace `SUPPORTED_PLATFORMS.map(...)` with `DISPLAY_PLATFORMS.map(...)` so only social platform names show.

Single file, six edits.

