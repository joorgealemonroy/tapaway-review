// Source-of-truth SMS consent copy. A2P 10DLC requires that marketing and
// transactional/informational consent are collected via SEPARATE, INDEPENDENT
// opt-ins. Never combine these two strings into a single checkbox. The exact
// wording shown at opt-in is what we persist for audit purposes.

export const SMS_MARKETING_CONSENT_TEXT =
  "I agree to receive recurring automated MARKETING text messages from TapAway and its participating merchant partners at the phone number I provided — including promotions, discount alerts, and loyalty rewards. Consent is not a condition of any purchase. Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel at any time, or HELP for help. See our Terms and Privacy Policy.";

export const SMS_TRANSACTIONAL_CONSENT_TEXT =
  "I agree to receive recurring automated REVIEW REMINDERS and service notifications from TapAway and its participating merchant partners at the phone number I provided. This is separate from marketing consent above. Consent is not a condition of any purchase. Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel at any time, or HELP for help. See our Terms and Privacy Policy.";

/**
 * @deprecated Use SMS_MARKETING_CONSENT_TEXT or SMS_TRANSACTIONAL_CONSENT_TEXT.
 * Retained as an alias to the marketing copy for backward compatibility only.
 */
export const SMS_CONSENT_TEXT = SMS_MARKETING_CONSENT_TEXT;

/**
 * Short, friendly summaries shown next to each checkbox. The FULL text above is
 * always available one tap away ("Full terms") and remains what we persist for
 * the A2P 10DLC audit trail.
 */
export const SMS_MARKETING_SHORT_LABEL = "Text me deals & VIP perks";
export const SMS_TRANSACTIONAL_SHORT_LABEL =
  "Text me review reminders & service updates";
export const SMS_SHORT_RATES_NOTE =
  "Recurring automated texts. Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel, HELP for help.";


export const SMS_DISCLOSURE_SHORT =
  "By submitting, you agree to receive the SMS program(s) you selected above from TapAway and its participating merchant partners at the number provided. Consent is not a condition of any purchase. Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel, HELP for help.";

export const SMS_HELP_NUMBER = "(978) 827-2929";
export const SMS_KEYWORD = "TAPVIP";
