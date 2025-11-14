// Grandfathered users who bypass all subscription/paywall checks
export const GRANDFATHERED_EMAILS = [
  'semr13@me.com',          // Sonia
  'islasfbaproducts@gmail.com', // Victor
  'placeholder@gmail.com'    // Amelia
];

export const isGrandfatheredUser = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return GRANDFATHERED_EMAILS.includes(email.toLowerCase());
};
