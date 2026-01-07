/**
 * Personal username utilities
 * Single source of truth for public username logic
 */

export type PersonalPlanType = "free" | "monthly" | "yearly";

/**
 * Get the public-facing username based on plan type
 * Free plan gets "tap" prefix, paid plans keep the raw username
 */
export const getPublicUsername = (planType: PersonalPlanType, username: string): string => {
  if (!username) return "";
  const cleanUsername = username.toLowerCase().trim();
  
  if (planType === "free") {
    // Free plan gets "tap" prefix
    return cleanUsername.startsWith("tap") ? cleanUsername : `tap${cleanUsername}`;
  }
  
  // Paid plans keep the raw username
  return cleanUsername;
};

/**
 * Get the full public profile URL
 */
export const getPublicProfileUrl = (planType: PersonalPlanType, username: string): string => {
  const publicUsername = getPublicUsername(planType, username);
  if (!publicUsername) return "";
  
  // Use origin for flexibility (works in dev and prod)
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tapaway.co";
  return `${origin}/${publicUsername}`;
};
