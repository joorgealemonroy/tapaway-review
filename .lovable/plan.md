

# Improve Signup Flow: Template-Guided Profile Setup with Cues

## Problem
When users select a layout template (Social Star, Business Pro, Creative Portfolio, Minimal), the template links are added with **empty values** and no guidance. Users land on the LinksStep builder and see items like "Instagram — (empty)" with no indication of what to fill in. The template `placeholder` data (e.g. "@yourhandle") exists in the template definition but is never surfaced to the user. There are also no contextual hints or guidance based on the selected template.

## Solution
Add template-aware cues and guidance throughout the profile builder (Step 2 — LinksStep) so that users who selected a template get a guided setup experience, while still having full control to customize everything.

### Changes

#### 1. Pass template placeholder data through to links
**File: `src/pages/personal/PersonalSignup.tsx`** (lines 157-169)

When applying a template, store each link's `placeholder` in the link's `value` field as a hint. Instead, add a new optional `placeholder` field to `PersonalLink` so the LinksStep can display it as a ghost cue.

**File: `src/hooks/usePersonalOnboarding.ts`**
- Add `placeholder?: string` to `PersonalLink` interface

**File: `src/pages/personal/PersonalSignup.tsx`**
- When creating template links, pass `placeholder: l.placeholder` so each link carries its hint text

#### 2. Show placeholder cues on empty template links in LinksStep
**File: `src/components/personal/signup/LinksStep.tsx`**

In the unified content list, when a link has no `value` (empty), show the `placeholder` text in a muted/italic style as guidance. For example:
- Instagram row shows "Instagram" with subtitle "@yourhandle" in muted italic instead of empty
- This cue disappears once the user fills in the value

#### 3. Add a template-aware welcome banner in LinksStep
**File: `src/components/personal/signup/LinksStep.tsx`**

Track which template was selected (store `templateId` in the onboarding data or read it from the applied links). Show a contextual banner at the top of the Content section:
- **Social Star**: "Fill in your handles below — tap any link to edit"
- **Business Pro**: "Add your professional info — tap any link to edit"  
- **Creative Portfolio**: "Showcase your work — tap any link to edit, add images below"
- **Minimal**: "Just the essentials — tap any link to edit"
- **No template / blank**: "Add links and blocks. Drag to reorder."

#### 4. Auto-open the first empty link for editing
**File: `src/components/personal/signup/LinksStep.tsx`**

When the step loads and there are template links with empty values, automatically open the LinkModal for the first empty link so the user is immediately guided to fill it in. This only triggers once (tracked via a `ref`).

#### 5. Add `selectedTemplate` field to onboarding data
**File: `src/hooks/usePersonalOnboarding.ts`**
- Add `selectedTemplate?: string | null` to `PersonalOnboardingData`
- Default: `null`

**File: `src/pages/personal/PersonalSignup.tsx`**
- When applying a template, store the template ID: `update({ selectedTemplate: templateId })`

#### 6. Visual "fill me in" indicator on empty links
**File: `src/components/personal/signup/LinksStep.tsx`**

For links with empty `value`, add a subtle pulsing dot or highlighted border to draw attention. When tapped, opens the edit modal. The styling:
- Orange/amber dashed border instead of solid border
- Small "Tap to fill in" hint text

### Files Modified
- `src/hooks/usePersonalOnboarding.ts` — Add `placeholder` to `PersonalLink`, add `selectedTemplate` to data
- `src/pages/personal/PersonalSignup.tsx` — Pass placeholder + template ID when applying templates
- `src/components/personal/signup/LinksStep.tsx` — Template cues banner, placeholder display, auto-open first empty link, visual indicators

### UI Example (LinksStep with "Social Star" template applied)

```text
┌──────────────────────────────┐
│  [Compact live preview]      │
├──────────────────────────────┤
│  Photo & Bio                 │
│  [📷]  [Headline input    ]  │
├──────────────────────────────┤
│  Content                     │
│  Fill in your handles below  │
│  — tap any link to edit      │
├──────────────────────────────┤
│  ≡ 🟣 Instagram              │
│       @yourhandle (tap to    │  ← placeholder cue, amber border
│       fill in)               │
│  ≡ 🎵 TikTok                 │
│       @yourhandle            │  ← placeholder cue
│  ≡ 🔴 YouTube                │
│       @yourchannel           │  ← placeholder cue
│  ≡ ✕  X / Twitter            │
│       @yourhandle            │  ← placeholder cue
├──────────────────────────────┤
│  [+ Add link] [+ Add block]  │
├──────────────────────────────┤
│  ▶ Style (collapsed)         │
├──────────────────────────────┤
│  [←] [      Continue      ]  │
└──────────────────────────────┘
```

Once a user taps a link and fills it in, the placeholder disappears and shows the actual value in normal styling.

