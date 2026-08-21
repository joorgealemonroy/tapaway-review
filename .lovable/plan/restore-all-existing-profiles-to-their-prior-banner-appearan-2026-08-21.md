# Restore all existing profiles to their prior banner appearance

## Immediate rollback
- Reverse the bulk database change for the 54 profiles modified together on August 21, restoring `banner_fit` from `contain` to the prior `cover` behavior.
- Restore **Reborn Wraps first** and verify its live hub before applying the same correction to the remaining affected profiles.
- Change the default back so future profiles are not silently assigned the new contain treatment.

## Restore the previous renderer
- Remove the globally applied fixed `banner_aspect` layout from the public hub, owner dashboard preview, and sales-partner preview.
- Restore the banner sizing, crop, fade, and content overlap behavior used before the recent banner overhaul so existing stored images render as they did previously.
- Keep the newly added database columns in place but inactive; avoiding destructive schema removal makes the rollback safer and preserves the option to redesign manual cropping later without affecting live profiles.

## Prevent another bulk regression
- Do not update existing profile presentation settings when introducing a new banner option.
- Any future crop/fit setting will be opt-in per profile and will only save after that profile’s owner or an admin explicitly edits it.

## Verification
- Check Reborn Wraps on the live public route, dashboard preview, and admin view first.
- Spot-check Xol Coffee, Las Islas Marias, Las Nuevas Islas, and a representative set of the other affected profiles at mobile and desktop sizes.
- Confirm all 54 bulk-modified profiles are restored, no manually adjusted profiles are overwritten, and browser console/runtime errors remain clean.

## Technical details
- The confirmed source is migration `20260821041715...`, whose unrestricted update changed every banner profile with `NULL`/`cover` to `contain`.
- Exactly 54 records share that migration timestamp; `banner_original_url` is null for every profile, confirming no owner-created manual crops need preservation during this rollback.