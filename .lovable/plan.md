
# Ensure New Users Always See the Welcome Tutorial

## Problem

Several navigation paths after signup redirect users to the Personal Dashboard without the `?welcome=true` query parameter, which means the coach marks tutorial never triggers. New users miss the guided walkthrough.

## Affected Paths

| Path | Current Redirect | Has `?welcome=true`? |
|------|-----------------|---------------------|
| Signed-in checkout complete | `/personal/dashboard?welcome=true` | Yes |
| Magic link verify | `/personal/dashboard?welcome=true` | Yes |
| SuccessScreen "Go to dashboard" button | `/personal/dashboard` | **No** |
| Magic link email redirect URL | `/personal/dashboard` | **No** |
| CardResolver card claim (existing user) | `/personal/dashboard?tab=cards` | **No** |

## Changes

### 1. SuccessScreen.tsx -- "Go to dashboard" button (line 181)

Change `navigate("/personal/dashboard")` to `navigate("/personal/dashboard?welcome=true")` so users who land on the success screen and click through still get the tutorial.

### 2. PersonalSignupComplete.tsx -- Magic link email redirect URL (line 365)

Change the `emailRedirectTo` from `/personal/dashboard` to `/personal/dashboard?welcome=true` so users who sign up without being logged in and click the magic link email also get the tutorial.

### 3. CardResolver.tsx -- Card claim redirect (line 109)

Change `navigate("/personal/dashboard?tab=cards")` to `navigate("/personal/dashboard?tab=cards&welcome=true")` so existing users who activate a card and land on the dashboard for the first time also see the tutorial.

Note: The tutorial already has built-in deduplication -- it checks `localStorage` for a `tapaway_personal_welcome_dismissed_{profileId}` key, so returning users who already completed the tutorial will never see it again. These changes are safe and have no side effects for existing users.

### No other files need changes

The `WelcomeCoachMarks` component and the dashboard's welcome detection logic (`welcomeParamRef`) already work correctly. This is purely a matter of ensuring all entry points pass the trigger parameter.
