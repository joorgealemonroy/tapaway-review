import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// APPLICATION FEE — Change this to take a cut of each sale
// e.g. 0.10 = 10%, 0.05 = 5%, 0 = no fee
// ============================================================
const APPLICATION_FEE_PERCENT = 0;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 10 requests per hour per IP
  const rlKey = getRateLimitKey(req, "create-product-checkout");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://tapaway.co';

    const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
      mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    );

    const { productId, buyerEmail, testMode, bookingId } = await req.json();

    if (!productId) {
      return new Response(JSON.stringify({ error: 'productId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get product + creator profile
    const { data: product, error: productError } = await supabaseAdmin
      .from('creator_products')
      .select('*, creator:personal_profiles!creator_id(id, stripe_connect_account_id, is_stripe_onboarded, username)')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creator = product.creator as any;
    const isTestMode = testMode === true || creator?.stripe_connect_account_id?.startsWith('acct_test_');

    if (!isTestMode) {
      if (!creator?.stripe_connect_account_id || !creator?.is_stripe_onboarded) {
        return new Response(JSON.stringify({ error: 'Creator not set up for payments' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const sessionParams: any = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            description: product.description || undefined,
          },
          unit_amount: product.price_cents,
        },
        quantity: 1,
      }],
      success_url: `${frontendUrl}/${creator.username}?purchase=success&session_id={CHECKOUT_SESSION_ID}${bookingId ? '&booking=success' : ''}`,
      cancel_url: `${frontendUrl}/${creator.username}`,
      metadata: {
        product_id: productId,
        creator_profile_id: creator.id,
        type: 'creator_marketplace',
        ...(bookingId ? { booking_id: bookingId } : {}),
        ...(isTestMode ? { test_mode: 'true' } : {}),
      },
    };

    // In test mode, skip transfer_data (fake acct_test_ IDs won't work with Stripe)
    // In production, use direct charges with application fee
    if (!isTestMode) {
      const feeAmount = Math.round(product.price_cents * APPLICATION_FEE_PERCENT);
      sessionParams.payment_intent_data = {
        application_fee_amount: feeAmount,
        transfer_data: {
          destination: creator.stripe_connect_account_id,
        },
      };
    }

    // Pre-fill buyer email if provided
    if (buyerEmail) {
      sessionParams.customer_email = buyerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[create-product-checkout] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
