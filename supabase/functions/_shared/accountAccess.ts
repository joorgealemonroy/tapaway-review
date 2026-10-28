import { readLimitedText } from './requestBody.ts';
import { takeQuota } from './storefrontRateLimit.ts';

export const accessCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const accessJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...accessCors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
export function normalizedEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}
export async function readAccessBody(req: Request): Promise<Record<string, unknown>> {
  const body = JSON.parse(await readLimitedText(req, 4096));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
  return body;
}
// Shared between recovery links and codes. A different worker or endpoint
// cannot reset the recipient, network or provider budget. No raw email/IP keys.
export async function allowAccessEmail(req: Request, email: string): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60000);
  const hour = Math.floor(Date.now() / 3600000);
  if (await takeQuota(req, 'access-mail-network', 20) < 0) return false;
  if (await takeQuota(req, 'access-mail-minute', 1, `${email}:${minute}`) < 0) return false;
  if (await takeQuota(req, 'access-mail-hour', 3, `${email}:${hour}`) < 0) return false;
  if (await takeQuota(req, 'access-mail-recipient', 6, email) < 0) return false;
  return await takeQuota(req, 'access-mail-budget', 1000, 'all') >= 0;
}
export async function allowAccessVerification(req: Request, email: string): Promise<boolean> {
  if (await takeQuota(req, 'access-verify-network', 60) < 0) return false;
  if (await takeQuota(req, 'access-verify-recipient', 30, email) < 0) return false;
  return await takeQuota(req, 'access-verify-budget', 10000, 'all') >= 0;
}
export function secureOtpCode(): string {
  // Rejection sampling avoids modulo bias; no Math.random for account access.
  const bytes = new Uint8Array(3); let value: number;
  do { crypto.getRandomValues(bytes); value = bytes[0] * 65536 + bytes[1] * 256 + bytes[2]; } while (value >= 16200000);
  return String(100000 + value % 900000);
}
