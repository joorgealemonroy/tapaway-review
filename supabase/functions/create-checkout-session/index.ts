import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SINGLE SOURCE OF TRUTH - Trial Price ID
// 30-day free trial, card required, $0 due today, $30/month after trial
const TRIAL_PRICE_ID = "price_1Sl3aCDg8DaTuVNZtL0SAQrl";

// Input validation
function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 255) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUuid(value: string | undefined): boolean {
  if (!value) return true; // Optional field
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const body = await req.json();
    const { email, userId, restaurantId, priceId } = body;
    
    // SAFETY CHECK: Only allow the trial price ID
    if (priceId && priceId !== TRIAL_PRICE_ID) {
      console.error('[create-checkout-session] BLOCKED: Invalid price ID attempted:', priceId);
      return new Response(
        JSON.stringify({ error: 'Invalid price configuration. Please use the trial signup.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!validateEmail(email)) {
      console.error('Invalid email format');
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!validateUuid(userId)) {
      console.error('Invalid userId format');
      return new Response(
        JSON.stringify({ error: 'Invalid userId format.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!validateUuid(restaurantId)) {
      console.error('Invalid restaurantId format');
      return new Response(
        JSON.stringify({ error: 'Invalid restaurantId format.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('[create-checkout-session] Creating trial checkout:', { 
      email: email.substring(0, 3) + '***', 
      priceId: TRIAL_PRICE_ID,
      userId: userId ? 'provided' : 'none', 
      restaurantId: restaurantId ? 'provided' : 'none' 
    });

    // Create checkout session using ONLY the trial price
    // Trial settings are configured on the price in Stripe - DO NOT override
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: TRIAL_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${req.headers.get('origin') || 'https://tapaway.co'}/onboarding?session_id={CHECKOUT_SESSION_ID}&source=stripe&price_id=${TRIAL_PRICE_ID}`,
      cancel_url: `${req.headers.get('origin') || 'https://tapaway.co'}/start`,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'MX'],
      },
      metadata: {
        plan_type: 'trial',
        price_id: TRIAL_PRICE_ID,
        user_id: userId || '',
        restaurant_id: restaurantId || '',
      },
    });

    console.log('[create-checkout-session] Session created:', {
      sessionId: session.id,
      priceId: TRIAL_PRICE_ID,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[create-checkout-session] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
