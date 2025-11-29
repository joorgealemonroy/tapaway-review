// Grandfathered users who bypass all subscription/paywall checks
export const GRANDFATHERED_EMAILS = [
  'semr13@me.com',          // Sonia
  'islasfbaproducts@gmail.com', // Victor
  'placeholder@gmail.com',    // Amelia
  'tester1@tapaway.co',      // Test account 1
  'tester2@tapaway.co',      // Test account 2
  'tester3@tapaway.co',      // Test account 3
];

export const isGrandfatheredUser = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return GRANDFATHERED_EMAILS.includes(email.toLowerCase());
};
