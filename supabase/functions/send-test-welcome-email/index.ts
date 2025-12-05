import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TapAway logo URL for emails
const TAPAWAY_LOGO_URL = 'https://tapaway-review.lovable.app/tapaway-logo.svg';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();
    
    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test data
    const ownerName = 'Jorge';
    const restaurantName = 'Test Restaurant';
    const dashboardUrl = 'https://tapaway-review.lovable.app/dashboard';
    const planName = 'yearly';
    const cardsQty = 15;
    const stripeReceiptUrl = null;
    const shippingEta = '3–5 business days';
    const logoUrl = TAPAWAY_LOGO_URL;

    const html = `
  <div style="background-color:#f5f5f7;padding:32px 16px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.5;">
      
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${logoUrl}" alt="TapAway" style="height:40px;max-width:100%;object-fit:contain;" />
      </div>

      <h1 style="font-size:24px;margin:0 0 12px 0;">Welcome to TapAway, ${ownerName} 🎉</h1>
      <p style="margin:0 0 16px 0;font-size:15px;color:#4b5563;">
        Your restaurant <strong>${restaurantName}</strong> is now set up and ready to collect more 5-star reviews.
      </p>

      <div style="border-radius:12px;border:1px solid #e5e7eb;padding:16px 18px;margin:16px 0;background:#f9fafb;">
        <p style="margin:0 0 8px 0;font-weight:600;font-size:14px;color:#111827;">Your order summary</p>
        <ul style="margin:0 0 8px 18px;padding:0;font-size:14px;color:#4b5563;">
          <li>Plan: <strong>${planName}</strong></li>
          <li>NFC review cards: <strong>${cardsQty}</strong></li>
          <li>Shipping: <strong>Standard (${shippingEta})</strong></li>
        </ul>
        ${stripeReceiptUrl ? `
          <p style="margin:8px 0 0 0;font-size:13px;">
            Stripe receipt:
            <a href="${stripeReceiptUrl}" style="color:#0f766e;text-decoration:underline;">view payment details</a>
          </p>
        ` : ``}
      </div>

      <div style="text-align:center;margin:20px 0;">
        <a href="${dashboardUrl}"
           style="display:inline-block;background:#111827;color:#ffffff;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;">
          Open my dashboard
        </a>
      </div>

      <h2 style="font-size:16px;margin:0 0 8px 0;">What happens next</h2>
      <ol style="margin:0 0 16px 18px;padding:0;font-size:14px;color:#4b5563;">
        <li>We prepare and print your NFC TapAway cards.</li>
        <li>We ship them to the address you provided at checkout.</li>
        <li>You place them for customers and start collecting reviews automatically.</li>
      </ol>

      <p style="margin:12px 0 4px 0;font-size:14px;color:#111827;font-weight:500;">Need help?</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">
        Contact us anytime at 
        <a href="mailto:tap@tapaway.co" style="color:#0f766e;text-decoration:underline;">tap@tapaway.co</a>.
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You're receiving this email because you created a TapAway account for <strong>${restaurantName}</strong>.
      </p>

    </div>
  </div>
`;

    const text = `
Welcome to TapAway, ${ownerName}!

Your restaurant "${restaurantName}" is now live.

Plan: ${planName}
Cards: ${cardsQty}
Shipping: ${shippingEta}

Dashboard:
${dashboardUrl}

Questions? Email tap@tapaway.co

– TapAway
`;

    const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from: emailFrom,
        subject: 'Welcome to TapAway – your cards are on the way 🎉',
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-test-welcome-email] Resend error:', errorText);
      return new Response(JSON.stringify({ error: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('[send-test-welcome-email] Email sent:', data);

    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-test-welcome-email] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
