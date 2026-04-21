

# Add Yelp Pill (Compliant Copy, Red Accent)

Add a Yelp-branded version of the existing "Google Review" white pill. To stay compliant with Yelp's review-solicitation policies, the default label uses neutral wording ("Check us out on Yelp") and avoids the word "Review" anywhere the user picks the platform.

## Visual

```text
┌────────────────────────────────────────────┐
│  [Y]   Check us out on Yelp          ↗     │   ← white pill, red Y (#D32323)
└────────────────────────────────────────────┘
```

Same structural treatment as the Google pill: white background, soft border + shadow, brand mark on the left, dark bold label, faded external-link arrow on the right.

## Code changes

### 1. `src/lib/platformLinks.tsx`
- Import `YelpIcon` from `@/components/icons/YelpIcon`.
- Add new platform config:
  ```ts
  {
    type: "yelp",
    label: "Check us out on Yelp",
    icon: YelpIcon,
    inputType: "url",
    placeholder: "https://www.yelp.com/biz/yourbusiness",
    generateUrl: (v) => v.startsWith("http") ? v : `https://www.yelp.com/biz/${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-[#D32323]",
  }
  ```
- Add brand color to the color map: `yelp: "#D32323"`.
- In `detectPlatformFromUrl`, return `"yelp"` for any URL containing `yelp.com` or `yelp.ca`.

### 2. `src/components/personal/ProfilePreviewRenderer.tsx` (~line 488)
- Add `const isYelp = link.link_type === 'yelp';`
- Change the white-pill className branch to fire on `isGoogleReview || isYelp`.
- When `isYelp && Icon`, render `<Icon className="h-7 w-7 flex-shrink-0" />` (no colored circle wrapper) so the red Y sits flush on white — mirrors the Google branch.
- Apply the same dark text / faded arrow when either pill type is active.

### 3. `src/pages/personal/PersonalProfilePage.tsx` (~line 253)
- Mirror the same change in the regular-link renderer.
- Add `const isYelp = link.link_type === 'yelp';`
- Combine with `isGoogleReview` for white-pill styling, dark text, and the icon at `h-8 w-8` without the gradient circle.

### 4. Default link label when Yelp is auto-detected
When Yelp is added via the link modal it will auto-fill `label = "Check us out on Yelp"` from the platform config — no extra work. (Users can still rename it.)

## Notes / out of scope

- **DB:** `personal_links.link_type` is free-text, so `"yelp"` works with no migration.
- **Validation:** `src/lib/urlValidation.ts` already restricts Yelp URLs to `yelp.com` / `yelp.ca` — no change needed.
- **B2B `ReviewHub.tsx`:** unchanged. It still uses its own `yelp_review_url` button with its existing copy. (Tell me if you want that copy softened too.)
- **Compliance:** the dropdown picker shows "Check us out on Yelp" (no "Review"), and the default rendered pill text matches. Users typing their own custom label is on them.

