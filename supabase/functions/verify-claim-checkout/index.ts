// Verifies a /claim checkout session and activates the hub.
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return json({ error: 'Invalid session id' }, 400);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return json({ ok: false, status: session.status });
    }

    const meta = session.metadata || {};
    const profileId = meta.profile_id;
    if (meta.type !== 'claim' || !profileId) return json({ error: 'Not a claim session' }, 400);

    const plan = meta.plan === 'annual' ? 'yearly' : 'monthly';
    const cardClub = meta.card_club === 'true';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: profile } = await admin
      .from('personal_profiles')
      .select('id, sales_rep_id, subscription_status, full_name, username')
      .eq('id', profileId)
      .maybeSingle();
    if (!profile) return json({ error: 'Hub not found' }, 404);

    const alreadyActive = profile.subscription_status === 'active';

    await admin
      .from('personal_profiles')
      .update({
        subscription_status: 'active',
        pipeline_status: 'active',
        plan_type: plan,
        has_card_addon: cardClub,
        is_approved: true,
        stripe_customer_id: (session.customer as string) || null,
        stripe_subscription_id: (session.subscription as string) || null,
        stripe_billing_email: session.customer_details?.email || null,
      })
      .eq('id', profileId);

    // Credit the rep who built the demo (idempotent per profile).
    if (!alreadyActive && profile.sales_rep_id) {
      const { data: existing } = await admin
        .from('commissions')
        .select('id')
        .eq('personal_profile_id', profileId)
        .eq('commission_type', 'upfront')
        .maybeSingle();

      if (!existing) {
        const { data: settings } = await admin
          .from('rep_compensation_settings')
          .select('lite_monthly_upfront, lite_annual_upfront, lite_point_value, annual_bounty_amount')
          .limit(1)
          .maybeSingle();

        const amount = plan === 'yearly'
          ? Number(settings?.lite_annual_upfront ?? 25)
          : Number(settings?.lite_monthly_upfront ?? 15);

        await admin.from('commissions').insert({
          rep_id: profile.sales_rep_id,
          personal_profile_id: profileId,
          type: 'close',
          commission_type: 'upfront',
          amount,
          status: 'available',
          plan_tier: plan === 'yearly' ? 'lite_annual' : 'lite_monthly',
          billing_cycle: plan,
          points_value: Number(settings?.lite_point_value ?? 1),
          stripe_subscription_id: (session.subscription as string) || null,
          period_label: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          note: `Hub claimed: ${profile.full_name || profile.username}`,
        });

        if (plan === 'yearly' && Number(settings?.annual_bounty_amount ?? 0) > 0) {
          await admin.from('commissions').insert({
            rep_id: profile.sales_rep_id,
            personal_profile_id: profileId,
            type: 'bonus',
            commission_type: 'annual_bounty',
            amount: Number(settings?.annual_bounty_amount),
            status: 'available',
            points_value: 0,
            period_label: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            note: 'Annual upsell bounty',
          });
        }
      }
    }

    return json({ ok: true, plan, cardClub });
  } catch (error) {
    console.error('[verify-claim-checkout] Error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
