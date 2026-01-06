/**
 * Personal TapAway Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for personal account settings.
 * When PERSONAL_PAYMENTS_ENABLED is false:
 * - Skip all Stripe/checkout redirects
 * - Do NOT block onboarding
 * - Do NOT show any paywall
 * - Create the account + personal profile immediately
 * - Mark the account as 'test_mode' so we can later require payment
 * 
 * When true:
 * - Use the real checkout flow
 */

export const PERSONAL_PAYMENTS_ENABLED = false;

// Trial configuration when payments are disabled
export const PERSONAL_TRIAL_CONFIG = {
  // Trial duration in days (0 = no trial limit for test mode)
  trialDays: 7,
  // Status to set in DB when payments are disabled
  paymentStatus: 'test_mode' as const,
  // Subscription status to use
  subscriptionStatus: 'active' as const,
};

// Plan prices (used for display even when payments disabled)
export const PERSONAL_PRICING = {
  monthly: 10,
  yearly: 75,
  extraCard: 10,
};
