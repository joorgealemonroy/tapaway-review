

# Fix: Restrict Grid Pairing to Known Media Platforms Only

## Problem
"Work with me 1 on 1" and "Trenchies Candy" both get `type: "other"` from the scraper. The current grid logic pairs any consecutive image links with the same `link_type` — so two `"other"` links get incorrectly paired as half-width grid cards.

## Fix — `src/pages/personal/ImportProfile.tsx`

Restrict grid pairing to only known media/embed platforms (e.g., `youtube`, `spotify`, `soundcloud`). Generic `"other"` or `"link"` types should never be grid-paired, even if consecutive with images.

Add a whitelist set:
```ts
const gridEligibleTypes = new Set(["youtube", "spotify", "soundcloud", "tiktok"]);
```

Update the pairing condition (line 157):
```ts
// Before:
rawLinks[imageIndices[k]].type === rawLinks[imageIndices[k + 1]].type

// After:
rawLinks[imageIndices[k]].type === rawLinks[imageIndices[k + 1]].type
&& gridEligibleTypes.has(rawLinks[imageIndices[k]].type)
```

This ensures only media-platform links (YouTube, Spotify, etc.) get the half-width grid treatment. Everything else stays full-width pill with thumbnail.

## File
- `src/pages/personal/ImportProfile.tsx` — add `gridEligibleTypes` set and update grid pairing condition (~line 155-157)

