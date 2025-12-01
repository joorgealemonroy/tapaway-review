import { isTestAccount } from './testAccounts';

// Super admin account (God mode - bypasses everything)
export const SUPER_ADMIN_EMAIL = 'tap@tapaway.co';

// Grandfathered users who bypass all subscription/paywall checks
export const GRANDFATHERED_EMAILS = [
  'semr13@me.com',          // Sonia
  'islasfbaproducts@gmail.com', // Victor
  'placeholder@gmail.com',    // Amelia
  'tester1@tapaway.co',      // Test account 1
  'tester2@tapaway.co',      // Test account 2
  'tester3@tapaway.co',      // Test account 3
];

export const isSuperAdmin = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return email.toLowerCase() === SUPER_ADMIN_EMAIL;
};

export const isGrandfatheredUser = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return GRANDFATHERED_EMAILS.includes(email.toLowerCase()) || isTestAccount(email);
};
