/**
 * Server consent blocker: browser choice and Stripe checkout metadata do not
 * establish current, revocable consent for delayed advertising/matching sends.
 * There is no authoritative visitor/account notice record + withdrawal lookup
 * in the existing schema. Do not invent one or trust a snapshot indefinitely.
 * Until that lookup is explicitly approved and implemented, fail closed.
 * Billing, invoice handling and fulfillment must not depend on this result.
 */
export function serverAdvertisingAllowed(): boolean {
  return false;
}