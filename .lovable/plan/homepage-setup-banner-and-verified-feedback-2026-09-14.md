# Homepage setup banner and verified feedback

## Scope

Update only the homepage banner, hero, and the new feedback section. Preserve the current visual system, spacing language, navigation, remaining sections, pricing, and behavior.

## Changes

1. **Replace both existing homepage banners with one smart setup banner**
   - Remove the always-on promotional banner from the homepage.
   - Render the replacement only after authentication has resolved and the visitor is signed in.
   - Check the signed-in user’s owned account records rather than trusting browser-only flags:
     - restaurant accounts: incomplete onboarding or a setup-pending subscription state;
     - Solo accounts: unfinished hub/card pipeline or cards not yet activated.
   - Do not render anything while status is loading, for signed-out visitors, or when every owned account is fully set up.
   - Send the action to the existing relevant setup/dashboard destination; do not add a new setup or billing flow.
   - Keep the current compact banner appearance and animation, including the close icon.
   - Store dismissal under a key containing the authenticated user ID, so closing it permanently suppresses it for that account without suppressing another user on the same browser.

2. **Simplify the hero**
   - Remove the complete “Trusted by local businesses across Southern California” badge block.
   - Leave the surrounding hero layout and all other content unchanged.

3. **Add “Verified Client Feedback” immediately below the hero CTA area**
   - Add a compact testimonial block within the existing hero flow, directly after the CTA and its supporting line.
   - Include five cards for Victor Ramirez, Sonia Berumen, Manuel Monroy, Amelia Zavala, and Alexis Ramirez.
   - Show no business names for now.
   - Use the supplied quotes, correcting only the accidental doubled opening quotation mark in Manuel’s text.
   - Use polished initial-based photo placeholders sized so real owner/business photos can replace them later without layout changes.
   - Reuse the homepage’s existing card, type, border, color, and motion conventions; no redesign of the rest of the page.

## Verification

- Confirm signed-out visitors and fully configured signed-in accounts see no banner.
- Confirm an account with a genuine unfinished setup/card state sees the banner and its action works.
- Confirm dismissal survives refresh for that user and does not affect another account.
- Check desktop and mobile layouts for the hero and all five feedback cards.
- Run the existing validation checks and confirm no new TypeScript, lint, console, or rendering errors.
