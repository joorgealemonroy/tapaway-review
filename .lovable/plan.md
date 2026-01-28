
## Plan: Replace Card Confirmation with Welcome Tutorial for Magic Link Users

### Overview
When users set their password via magic link and land on the dashboard for the first time, show a welcoming tutorial modal instead of the card confirmation modal. This provides a friendlier onboarding experience with step-by-step guidance on how to use the platform, with an option to dismiss/ignore.

### Current Flow
1. Admin sends magic link → User clicks → Creates password at `/auth/magic`
2. User redirected to `/personal/dashboard`
3. If `card_confirmed === false` and has paid plan → Card confirmation modal appears

### New Flow
1. Admin sends magic link → User clicks → Creates password at `/auth/magic`
2. Redirect includes query param: `/personal/dashboard?welcome=true`
3. Dashboard shows **Welcome Tutorial Modal** (not card confirmation)
4. User can dismiss tutorial → gets redirected to Card tab to confirm design at their leisure
5. Card confirmation becomes a task in the Card tab, not a blocking modal

---

### Implementation Details

#### 1. Update Magic Link Redirect (MagicLinkVerify.tsx)

Add a query parameter to indicate this is a first-time setup:

```typescript
// Line 83-85 - Update redirect URL
setTimeout(() => {
  navigate("/personal/dashboard?welcome=true", { replace: true });
}, 1500);
```

#### 2. Create Welcome Tutorial Component

**New file: `src/components/personal/WelcomeTutorialModal.tsx`**

A welcoming modal with step-by-step tutorial covering:
- **Welcome message**: "Welcome to TapAway! 🎉"
- **Your profile URL**: Shows their tapaway.co/username link
- **Step 1**: Add/edit your links (explains the Links tab)
- **Step 2**: Customize your design (explains the Design tab) 
- **Step 3**: Confirm your card design (directs to Card tab)
- **Step 4**: Share your profile (copy link functionality)

Features:
- Progress dots or simple step navigation
- "Skip Tutorial" / "Got it!" button to dismiss
- Stores dismissal in localStorage: `tapaway_personal_welcome_dismissed_${profileId}`

#### 3. Update PersonalDashboard.tsx

**Remove automatic card confirmation modal trigger:**
- Change the useEffect at lines 197-206 to NOT auto-show the card confirmation modal

**Add welcome tutorial logic:**
```typescript
// New state
const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);

// Check for welcome param on mount
useEffect(() => {
  const isWelcome = searchParams.get("welcome") === "true";
  const dismissKey = `tapaway_personal_welcome_dismissed_${profile?.id}`;
  const alreadyDismissed = localStorage.getItem(dismissKey);
  
  if (isWelcome && !alreadyDismissed && profile) {
    setShowWelcomeTutorial(true);
    // Clear the URL param
    setSearchParams({});
  }
}, [profile, searchParams, setSearchParams]);

// Dismiss handler
const handleDismissWelcome = () => {
  localStorage.setItem(`tapaway_personal_welcome_dismissed_${profile.id}`, 'true');
  setShowWelcomeTutorial(false);
};
```

**Update card confirmation modal behavior:**
- Don't auto-show on first visit
- Keep the card confirmation flow in the Card tab for users to trigger manually
- Add a visual indicator (badge/dot) on Card tab if `card_confirmed === false`

#### 4. Add Card Tab Notification Badge

Show a small notification indicator on the Card tab if the user hasn't confirmed their card design yet:

```tsx
<TabsTrigger value="card" className="flex items-center gap-2 relative">
  <CreditCard className="h-4 w-4" />
  <span className="hidden sm:inline">Card</span>
  {!profile.card_confirmed && profile.plan_type !== "free" && (
    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
  )}
</TabsTrigger>
```

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/auth/MagicLinkVerify.tsx` | Edit | Add `?welcome=true` to redirect URL |
| `src/components/personal/WelcomeTutorialModal.tsx` | Create | New welcome tutorial modal component |
| `src/pages/personal/PersonalDashboard.tsx` | Edit | Replace card modal trigger with welcome tutorial, add notification badge to Card tab |

---

### Technical Notes

**Welcome Tutorial Modal Content:**
- Step 1: "Add Your Links" - Icon: Link2, explains adding social links
- Step 2: "Customize Your Look" - Icon: Palette, explains design options
- Step 3: "Get Your Card" - Icon: CreditCard, directs to Card tab
- Step 4: "Share Everywhere" - Icon: Share2, shows profile URL

**UX Considerations:**
- Tutorial is skippable at any point
- Dismissal persisted to localStorage (no DB migration needed)
- Card confirmation moved to Card tab as a prominent CTA, not a blocking modal
- Progress indicator shows which step user is on
