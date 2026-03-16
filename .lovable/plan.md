

# Plan: Universal Header Icons & Custom Button Labels

## 1. Fix Header Icons (PersonalProfilePage.tsx)

The `iconLinks` filter on line 1008 already includes `display_style === 'both'`. The issue is that `SocialIconBar` returns `null` for links where `getPlatformConfig(link.link_type)` returns no icon. Instagram and TikTok should have configs — need to verify they're being saved with the correct `link_type` value (e.g., `"instagram"` not `"Instagram"`).

Looking at the code, the filter logic is correct. The likely issue is that links with `display_style === 'both'` that are social types (instagram, tiktok) are also showing in `pillLinks` (line 1010 — includes everything except `display_style === 'icon'`). Since they appear as pill buttons in the main list, the `SocialIconBar` should also show them as icons. The actual rendering in `SocialIconBar` checks `if (!Icon) return null` — so if `getPlatformConfig` returns a valid config with an icon for `instagram`/`tiktok`, they should render.

**Diagnosis**: The icon bar filter is correct. If icons aren't showing, it's because the saved `link_type` doesn't match a platform config, OR the links have no URL (empty value). Need to verify `SocialIconBar` doesn't skip links with empty URLs. Looking at the code — it doesn't filter by URL presence, so this should work.

**Actual fix needed**: The `SocialIconBar` renders fine for links with `display_style === 'both'`. The real issue may be that during signup, if a user doesn't fill in a value, the link still gets saved with an empty URL. The icon bar will render a broken link. We should filter out links with empty/invalid URLs from the icon bar.

**Change**: In `PersonalProfilePage.tsx` line 1008, add a URL presence check:
```typescript
const iconLinks = links.filter((l: any) => l.is_active !== false && l.url && l.url.trim() !== '' && (l.display_style === 'icon' || l.display_style === 'both'));
```

## 2. Custom Button Labels (PersonalizeStep.tsx)

Add a subtle secondary input below the username/handle input for each link, bound to `link.label`.

**`src/hooks/usePersonalOnboarding.ts`**: The `PersonalLink` interface already has a `label` field. No changes needed.

**`src/components/personal/signup/PersonalizeStep.tsx`** (~line 262-277):
- After the existing `<Input>` for the value/handle, add a new smaller input:
```tsx
<Input
  value={link.label}
  onChange={(e) => updateLink(link.id, { label: e.target.value })}
  placeholder={`Label (Optional - e.g., Shop my store!)`}
  className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 opacity-60 mt-1"
/>
```

**`src/components/personal/signup/CheckoutStep.tsx`**: Already saves `label: link.label` (line 772). The label from the vibe template is the platform name by default. If the user customizes it, it persists. No changes needed here.

## 3. Text Overflow on Buttons (PersonalProfilePage.tsx)

In the `ProfileLink` component, add `truncate` to the label `<span>` elements:

- **Regular links** (line 271): Add `truncate` to the span class
- **Featured links** (line 233): Add `truncate` to the span class  
- **Grid card links** (line 170-171): Add `truncate` to the span class
- **Full-width card links** (line 203-204): Add `truncate` to the span class

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Add URL filter to iconLinks; add `truncate` to all label spans in ProfileLink |
| `src/components/personal/signup/PersonalizeStep.tsx` | Add optional label input below each link's value input |

