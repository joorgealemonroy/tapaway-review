import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY');

    const headers = {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Create Card Club product + $5/mo price
    const clubProductRes = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        'name': 'TapAway Card Club',
        'description': '3 NFC cards per month, shipping included',
      }),
    });
    const clubProduct = await clubProductRes.json();

    const clubPriceRes = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        'product': clubProduct.id,
        'unit_amount': '500',
        'currency': 'usd',
        'recurring[interval]': 'month',
      }),
    });
    const clubPrice = await clubPriceRes.json();

    // Create One-Time Card product + $10 price
    const onetimeProductRes = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        'name': 'TapAway NFC Cards (One-Time)',
        'description': '3 NFC cards, one-time order',
      }),
    });
    const onetimeProduct = await onetimeProductRes.json();

    const onetimePriceRes = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        'product': onetimeProduct.id,
        'unit_amount': '1000',
        'currency': 'usd',
      }),
    });
    const onetimePrice = await onetimePriceRes.json();

    return new Response(JSON.stringify({
      card_addon_price_id: clubPrice.id,
      card_onetime_price_id: onetimePrice.id,
      club_product_id: clubProduct.id,
      onetime_product_id: onetimeProduct.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
