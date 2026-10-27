import { isAdmin as hasAdminRole } from "../_shared/security.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getStripe, stripeMode } from '../_shared/paymentFirst.ts';
import { legacyCardPaymentProof } from '../_shared/legacyCardAllowance.ts';
import { takeQuota } from '../_shared/storefrontRateLimit.ts';
import { readLimitedText } from '../_shared/requestBody.ts';
import { escapeHtml } from '../_shared/sanitize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARD_ADDON_PRICE_ID = 'price_1TMM0LDg8DaTuVNZUgZ4GtWJ';
const CARD_ONETIME_PRICE_ID = 'price_1TMM0LDg8DaTuVNZZ2EfLZrk';
const MONTHLY_LIMIT = 3;
class RequestError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new RequestError('Please sign in.', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new RequestError('Please sign in.', 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let body: any;
    try { body = JSON.parse(await readLimitedText(req, 8192)); } catch { throw new RequestError('Invalid request.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Invalid request.');
    const { flow, profile_id, quantity, shipping } = body;

    if (!['fetch_address','free_request','subscribe_addon','onetime'].includes(flow) || typeof profile_id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile_id)) throw new RequestError('Invalid card request.');
    if (await takeQuota(req, 'card-order-network', 30) < 0 || await takeQuota(req, 'card-order-user', 20, user.id) < 0
      || await takeQuota(req, 'card-order-global', 1000, 'all') < 0) throw new RequestError('Please try again later.', 429);

    // Verify ownership
    const { data: profile } = await supabaseAdmin
      .from('personal_profiles')
      .select('id, user_id, has_card_addon, stripe_customer_id, email, plan_type, onboarding_source')
      .eq('id', profile_id)
      .single();

    if (!profile) throw new RequestError('Profile not found.', 404);

    // Allow admin OR profile owner
    const isOwner = profile.user_id === user.id;
    const isAdmin = await hasAdminRole(user.id);
    if (!isOwner && !isAdmin) throw new RequestError('Profile not found.', 404);

    if (profile.plan_type === "personal_hosted" && flow !== "fetch_address") {
      return new Response(JSON.stringify({ error: "Personal cards are ordered at /personal/design. Card Club is for businesses." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.onboarding_source?.startsWith("payment_first") && flow === "subscribe_addon") {
      return new Response(JSON.stringify({ error: "Card Club is selected with the business order. Use your Cards tab to manage it." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // ── FETCH ADDRESS (read-only, returns Stripe shipping) ──
    if (flow === 'fetch_address') {
      if (!profile.stripe_customer_id) {
        return new Response(JSON.stringify({ address: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id) as any;
      const shipping = customer.shipping;
      const addr = shipping?.address || customer.address;
      return new Response(JSON.stringify({
        address: addr ? {
          name: shipping?.name || customer.name || '',
          line1: addr.line1 || '',
          line2: addr.line2 || '',
          city: addr.city || '',
          state: addr.state || '',
          postal_code: addr.postal_code || '',
          country: addr.country || 'US',
        } : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The legacy add-on is distinct from the newer 4/15-card Card Club plan.
    // Fresh provider proof and one database transaction protect its 3/month cap.
    if (flow === 'free_request') {
      if (stripeMode() !== 'live') throw new RequestError('Card requests are temporarily unavailable.', 503);
      if (profile.onboarding_source?.startsWith('payment_first')) throw new RequestError('Use the Card Club section in your Cards tab.', 409);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MONTHLY_LIMIT
        || typeof body.requestKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestKey)) {
        throw new RequestError('Choose 1–3 cards and submit your request again.');
      }
      const address: Record<string, string> = {};
      for (const field of ['name','line1','line2','city','state','postal_code','country']) {
        const value = field === 'country' ? (shipping?.[field] || 'US') : (shipping?.[field] ?? '');
        if (typeof value !== 'string' || value.length > 200 || (field !== 'line2' && !value.trim())) throw new RequestError('Complete shipping address required.');
        address[field] = value.trim();
      }
      if (!/^[A-Z]{2}$/.test(address.country)) throw new RequestError('Choose a valid shipping country.');
      const entitlement = await supabaseAdmin.rpc('personal_profile_is_active', { _profile_id: profile.id });
      if (entitlement.error) throw entitlement.error;
      if (entitlement.data !== true) throw new RequestError('An active hub is required before requesting cards.', 403);
      const proof = await legacyCardPaymentProof(getStripe(), supabaseAdmin, profile);
      if (!proof) throw new RequestError('An active, paid Card Club membership is required. Open your Plan tab or contact support.', 403);
      const reserved = await supabaseAdmin.rpc('reserve_legacy_card_addon', {
        _profile_id: profile.id, _owner_id: profile.user_id, _stripe_customer_id: profile.stripe_customer_id,
        _stripe_subscription_id: proof.subscriptionId, _stripe_invoice_id: proof.invoiceId, _stripe_payment_intent_id: proof.paymentIntentId,
        _quantity: quantity, _shipping: address, _request_key: body.requestKey,
      });
      if (reserved.error) {
        if (['22023','23505'].includes(reserved.error.code)) throw new RequestError('This card request could not be saved. Refresh your Cards tab.', 409);
        throw reserved.error;
      }
      if (reserved.data?.success !== true) throw new RequestError(`You have ${Math.max(0, reserved.data?.remaining ?? 0)} cards left in this month's allowance.`, 409);
      if (!reserved.data.duplicate) {
        try {
          const resendApiKey = Deno.env.get('RESEND_API_KEY'), emailInternal = Deno.env.get('EMAIL_INTERNAL');
          if (resendApiKey && emailInternal) {
            const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
            await fetch('https://api.resend.com/emails', {
              method: 'POST', headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json',
                'Idempotency-Key': `legacy-card-request-${reserved.data.requestId}` },
              body: JSON.stringify({ from: emailFrom.includes('<') ? emailFrom : `TapAway <${emailFrom}>`, to: [emailInternal],
                subject: `Card Club request: ${quantity} cards`,
                html: `<p><strong>${escapeHtml(address.name)}</strong> requested ${quantity} card(s).</p><p>${escapeHtml(address.line1)}<br/>${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postal_code)}</p>`,
              }),
            });
          }
        } catch { /* The durable order remains visible in the admin queue. */ }
      }
      return new Response(JSON.stringify(reserved.data), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // ── STRIPE CHECKOUT FLOWS ──
    const stripe = getStripe();
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://tapaway.co';

    // Reuse existing stripe customer or create one
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile.email });
      customerId = customer.id;
      await supabaseAdmin
        .from('personal_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile_id);
    }

    const sessionParams: any = {
      customer: customerId,
      success_url: `${frontendUrl}/dashboard?tab=cards&order=success`,
      cancel_url: `${frontendUrl}/dashboard?tab=cards`,
      metadata: {
        profile_id,
        user_id: user.id,
        shipping_name: shipping?.name || '',
        shipping_line1: shipping?.line1 || '',
        shipping_line2: shipping?.line2 || '',
        shipping_city: shipping?.city || '',
        shipping_state: shipping?.state || '',
        shipping_postal_code: shipping?.postal_code || '',
        shipping_country: shipping?.country || 'US',
      },
    };

    if (flow === 'subscribe_addon') {
      sessionParams.mode = 'subscription';
      sessionParams.line_items = [{ price: CARD_ADDON_PRICE_ID, quantity: 1 }];
      sessionParams.metadata.type = 'card_addon';
    } else if (flow === 'onetime') {
      sessionParams.mode = 'payment';
      sessionParams.line_items = [{ price: CARD_ONETIME_PRICE_ID, quantity: 1 }];
      sessionParams.metadata.type = 'card_onetime';
    } else {
      throw new Error('Invalid flow');
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[create-card-order]', err instanceof Error ? err.name : 'unknown');
    return new Response(JSON.stringify({ error: err instanceof RequestError ? err.message : 'Could not complete your card request. Please try again.' }), {
      status: err instanceof RequestError ? err.status : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
});
