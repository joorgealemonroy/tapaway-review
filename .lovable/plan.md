

# Add Calendar Icon to Corporate Vibe's "Book a Call" Button

This is a small tweak that will be part of the larger carousel upgrade (adding Cyber, Editorial, Corporate vibes + higher-fidelity mockups). Since the Corporate vibe doesn't exist yet, the full implementation covers:

## Changes

### 1. `src/lib/vibeTemplates.ts` — Add 3 new vibes
- Add `glowColor` to `VibeTemplate` interface
- Add `iconHint` optional field to the `defaultLinks` type (string like `"calendar"`, `"briefcase"`)
- Add **Cyber** vibe: dark `#0a0a0a` bg, neon `#bf00ff`/`#ff00aa` accents
- Add **Editorial** vibe: warm beige `#f5f0eb`, serif feel, image blocks
- Add **Corporate** vibe: navy `#1e3a5f` header, white bg, with a "Book a Call" link that has `iconHint: "calendar"`
- Add `glowColor` to existing 3 vibes

### 2. `src/components/personal/PhoneMockup.tsx` — Render icon hints
- Import `Calendar` from `lucide-react`
- In the link pill rendering, check `link.iconHint === "calendar"` — if so, render a tiny `<Calendar>` icon (sized ~10px, colored with `t.accent`) instead of the generic colored circle
- This gives Corporate's "Book a Call" a distinct calendar icon while creative vibes keep their round social-style indicators

### 3. `src/pages/personal/VibeSelection.tsx` — Support 6 vibes
- The carousel already maps `VIBE_TEMPLATES`, so adding new entries to the array automatically includes them
- Update the dynamic CTA text and glow logic per the existing approved plan

No database changes needed.

