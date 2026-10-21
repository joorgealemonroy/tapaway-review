import { takeQuota } from './storefrontRateLimit.ts';

let cached: { secret: string | null; until: number } | undefined;
let pending: Promise<string | null> | undefined;

/** Retrieve only this project's enabled webhook through Resend's authenticated
 * API. The secret stays in server memory, never source, logs, responses or DB.
 * An explicit Cloud secret remains preferred and avoids a provider read.
 */
export async function emailWebhookSecret(req: Request): Promise<string | null> {
  const configured = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (configured) return configured;
  if (cached && cached.until > Date.now()) return cached.secret;
  if (pending) return pending;
  pending = (async () => {
    let secret: string | null = null;
    try {
      const key = Deno.env.get('RESEND_API_KEY'), project = Deno.env.get('SUPABASE_URL');
      if (!key || !project) return null;
      const hour = new Date().toISOString().slice(0, 13);
      if (await takeQuota(req, 'email-webhook-config', 60, hour) < 0) return null;
      const response = await fetch('https://api.resend.com/webhooks?limit=100', {
        headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const body = await response.json();
      const target = `${project.replace(/\/$/, '')}/functions/v1/email-delivery-webhook`;
      const matches = Array.isArray(body.data) ? body.data.filter((w: { endpoint?: string; status?: string }) => w.endpoint === target && w.status === 'enabled') : [];
      // Refuse ambiguous or paginated configuration instead of guessing a key.
      if (body.has_more || matches.length !== 1) return null;
      const value = matches[0].signing_secret;
      if (typeof value === 'string' && /^whsec_[A-Za-z0-9+/=_-]+$/.test(value)) secret = value;
      return secret;
    } catch { return null; }
    finally { cached = { secret, until: Date.now() + (secret ? 300000 : 30000) }; }
  })();
  try { return await pending; } finally { pending = undefined; }
}
