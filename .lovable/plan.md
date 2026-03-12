

# Fix Import Flow: Duplicate Labels + Too Many Links

## Problems Identified

### 1. "InstagramInstagram" duplicate labels
The Linktree scraper extracts anchor inner text by stripping HTML tags. Linktree's social link anchors contain duplicate text (e.g., `<span>Instagram</span><span>Instagram</span>`) which produces "InstagramInstagram" after tag stripping. This carries through to the label displayed in both the carousel and phone preview.

### 2. 12 links instead of 5
The import consumer in `PersonalSignup.tsx` calls `addLink()` which **appends** to existing links. If the user previously visited the signup page (triggering a localStorage draft with template links), or if the draft already has links, the imported links stack on top. The draft is loaded on mount, then the import effect adds more.

## Solution

### File: `src/pages/personal/PersonalSignup.tsx`

**Fix 1 — Clear links before importing**: Before adding imported links, call `update({ links: [], blocks: [] })` to wipe any draft/template content. This ensures only the imported links appear.

**Fix 2 — Use platform config labels for known types**: Instead of using the raw scraped label (which may be garbled), check if the link type is a known platform (e.g., "instagram") and use the platform config's label (e.g., "Instagram") from `getPlatformConfig()`. Fall back to the scraped label for unknown types.

```typescript
// Before adding imported links, clear existing content
update({ links: [], blocks: [] });

for (const link of imported.links) {
  const platformConfig = getPlatformConfig(link.type);
  addLink({
    type: link.type || 'website',
    url: link.url,
    label: platformConfig?.label || link.label || 'Link',
    value: '',
  });
}
```

### File: `supabase/functions/scrape-link-bio/index.ts`

**Fix 3 — Deduplicate scraped labels at source**: Add a deduplication step to `extractLinks` — if the stripped label is a repeated word (e.g., "InstagramInstagram"), split it in half and use the single word. This is a safety net for any platform that renders labels this way.

```typescript
// In extractLinks, after stripping HTML:
// Detect repeated-word labels like "InstagramInstagram"
if (label.length >= 6 && label.length % 2 === 0) {
  const half = label.substring(0, label.length / 2);
  if (label === half + half) label = half;
}
```

## Summary
- 2 files changed: `PersonalSignup.tsx`, `scrape-link-bio/index.ts`
- Import now clears draft before adding scraped links
- Labels use platform config names for known types, with dedup at the scraper level as a fallback

