import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Webhook } from 'https://esm.sh/svix@1.76.1';
import { admin } from '../_shared/paymentFirst.ts';
serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!secret) return new Response('Not configured', { status: 503 });
  const raw = await req.text();
  if (raw.length > 100000) return new Response('Too large', { status: 413 });
  let event: { type: string; created_at: string; data: { email_id?: string } };
  const eventId = req.headers.get('svix-id') || '';
  try { event = new Webhook(secret).verify(raw, {
    'svix-id': eventId, 'svix-timestamp': req.headers.get('svix-timestamp') || '', 'svix-signature': req.headers.get('svix-signature') || '',
  }) as typeof event; } catch { return new Response('Invalid signature', { status: 400 }); }
  const status = ({ 'email.sent': 'sent', 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'complained', 'email.failed': 'failed' } as Record<string,string>)[event.type];
  if (!status) return new Response('Ignored', { status: 200 });
  if (!event.data?.email_id || !Number.isFinite(Date.parse(event.created_at))) return new Response('Invalid event', { status: 400 });
  const { error } = await admin().rpc('record_email_delivery', { _event_id: eventId, _resend_id: event.data.email_id, _status: status, _occurred_at: event.created_at });
  return new Response(error ? 'Retry' : 'ok', { status: error ? 503 : 200 });
});
