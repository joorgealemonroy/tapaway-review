import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARD_ADDON_PRICE_ID = 'price_1TMM0LDg8DaTuVNZUgZ4GtWJ';
const CARD_ONETIME_PRICE_ID = 'price_1TMM0LDg8DaTuVNZZ2EfLZrk';
const MONTHLY_LIMIT = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { flow, profile_id, quantity, shipping } = body;

    if (!flow || !profile_id) throw new Error('Missing required fields');

    // Verify ownership
    const { data: profile } = await supabaseAdmin
      .from('personal_profiles')
      .select('id, user_id, has_card_addon, stripe_customer_id, email')
      .eq('id', profile_id)
      .single();

    if (!profile) throw new Error('Profile not found');

    // Allow admin OR profile owner
    const isOwner = profile.user_id === user.id;
    const isAdmin = user.email === 'tap@tapaway.co';
    if (!isOwner && !isAdmin) throw new Error('Profile not found');

    // ── FETCH ADDRESS (read-only, returns Stripe shipping) ──
    if (flow === 'fetch_address') {
      if (!profile.stripe_customer_id) {
        return new Response(JSON.stringify({ address: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
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

    // ── FREE REQUEST (Card Club member) ──
    if (flow === 'free_request') {
      if (!profile.has_card_addon) throw new Error('Card Club membership required');

      const qty = Math.min(Math.max(1, quantity || 1), MONTHLY_LIMIT);

      // Quota check: sum quantities for pending+shipped this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthRequests } = await supabaseAdmin
        .from('personal_card_requests')
        .select('quantity')
        .eq('profile_id', profile_id)
        .in('status', ['pending', 'shipped'])
        .gte('created_at', monthStart.toISOString());

      const used = (monthRequests || []).reduce((s: number, r: any) => s + r.quantity, 0);
      if (used + qty > MONTHLY_LIMIT) {
        throw new Error(`Monthly limit reached. ${MONTHLY_LIMIT - used} cards remaining.`);
      }

      // Validate shipping
      if (!shipping?.name || !shipping?.line1 || !shipping?.city || !shipping?.state || !shipping?.postal_code) {
        throw new Error('Complete shipping address required');
      }

      const { error: insertErr } = await supabaseAdmin
        .from('personal_card_requests')
        .insert({
          profile_id,
          user_id: user.id,
          quantity: qty,
          is_addon: true,
          status: 'pending',
          shipping_name: shipping.name,
          shipping_address_line1: shipping.line1,
          shipping_address_line2: shipping.line2 || null,
          shipping_city: shipping.city,
          shipping_state: shipping.state,
          shipping_postal_code: shipping.postal_code,
          shipping_country: shipping.country || 'US',
        });

      if (insertErr) throw insertErr;

      // Internal notification email
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const emailInternal = Deno.env.get('EMAIL_INTERNAL');
        if (resendApiKey && emailInternal) {
          const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: emailFrom.includes('<') ? emailFrom : `TapAway <${emailFrom}>`,
              to: [emailInternal],
              subject: `📦 Card Club Request — ${qty} cards`,
              html: `<p><strong>${shipping.name}</strong> requested ${qty} card(s).</p>
                     <p>${shipping.line1}${shipping.line2 ? ', ' + shipping.line2 : ''}<br/>${shipping.city}, ${shipping.state} ${shipping.postal_code}</p>
                     <p>Profile: ${profile_id}</p>`,
            }),
          });
        }
      } catch (_) { /* non-blocking */ }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STRIPE CHECKOUT FLOWS ──
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
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
    console.error('[create-card-order]', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
