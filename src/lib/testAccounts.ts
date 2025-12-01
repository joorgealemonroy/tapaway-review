// Test accounts for internal testing and onboarding UX verification
export const TEST_ACCOUNTS = [
  {
    email: "test-owner1@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 1",
    restaurantName: "Test Restaurant 1 (TEST)",
    slug: "test-restaurant-1"
  },
  {
    email: "test-owner2@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 2",
    restaurantName: "Test Restaurant 2 (TEST)",
    slug: "test-restaurant-2"
  },
  {
    email: "test-owner3@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 3",
    restaurantName: "Test Restaurant 3 (TEST)",
    slug: "test-restaurant-3"
  }
];

export function isTestAccount(email?: string | null): boolean {
  if (!email) return false;
  return TEST_ACCOUNTS.some(t => t.email.toLowerCase() === email.toLowerCase());
}
