// Offline release gate. These handlers use test doubles or isolated PostgreSQL.
// Live-provider integration scripts are deliberately not part of this gate.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (!process.env.QA_MODULES) throw new Error('Set QA_MODULES to the isolated test dependencies directory.');
const scripts = [
  'check-client-security.cjs', 'check-client-url-security.cjs', 'check-booking-calendar.cjs',
  'check-legacy-onboarding-security.cjs', 'check-personal-commerce.cjs', 'check-payment-relaunch.cjs',
  'check-personal-activation-security.cjs', 'check-creator-checkout.cjs', 'check-creator-fulfillment.cjs',
  'check-in-person-payment-security.cjs', 'check-legacy-card-payment.cjs', 'check-hub-payment-activation.cjs',
  'check-nonpayment-security.cjs', 'check-notification-security.cjs', 'check-launch-functions.cjs',
  'check-launch-followup.cjs', 'check-relaunch-database.cjs', 'check-payment-reversals-db.cjs',
  'check-checkout-attempts-db.cjs', 'check-storefront-quota.cjs', 'check-founding-grants-db.cjs',
];
for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS ${scripts.length} offline release suites. No live-provider tests requested.`);
