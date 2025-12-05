import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TapAway logo URL for emails
const TAPAWAY_LOGO_URL = 'https://tapaway-review.lovable.app/tapaway-logo.svg';

// Email sending helper with text fallback support
async function sendEmail(options: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('[finalize-onboarding] RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[finalize-onboarding] Resend API error:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('[finalize-onboarding] Email sent successfully:', data.id);
    return true;
  } catch (error) {
    console.error('[finalize-onboarding] Email send failed:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[finalize-onboarding] Auth error:', userError);
      return new Response(JSON.stringify({ success: false, error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[finalize-onboarding] Processing for user:', user.id, user.email);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const restaurantIdFromBody = body.restaurantId;

    // Find the user's active restaurant
    let restaurantQuery = supabaseAdmin
      .from('restaurants')
      .select('id, restaurant_name, custom_slug, owner_name, email, plan_type')
      .eq('owner_id', user.id);
    
    if (restaurantIdFromBody) {
      restaurantQuery = restaurantQuery.eq('id', restaurantIdFromBody);
    }

    const { data: restaurant, error: restaurantError } = await restaurantQuery.maybeSingle();

    if (restaurantError || !restaurant) {
      console.error('[finalize-onboarding] Restaurant not found:', restaurantError);
      return new Response(JSON.stringify({ success: false, error: 'Restaurant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[finalize-onboarding] Found restaurant:', restaurant.id, restaurant.restaurant_name);

    // Find fulfillment order awaiting onboarding
    const { data: fulfillmentOrder, error: fulfillmentError } = await supabaseAdmin
      .from('fulfillment_orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'awaiting_onboarding')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fulfillmentError) {
      console.error('[finalize-onboarding] Fulfillment query error:', fulfillmentError);
    }

    let fulfillmentUpdated = false;
    if (fulfillmentOrder) {
      // Update status to pending
      const { error: updateError } = await supabaseAdmin
        .from('fulfillment_orders')
        .update({ status: 'pending' })
        .eq('id', fulfillmentOrder.id);

      if (updateError) {
        console.error('[finalize-onboarding] Failed to update fulfillment status:', updateError);
      } else {
        fulfillmentUpdated = true;
        console.log('[finalize-onboarding] Fulfillment order updated to pending:', fulfillmentOrder.id);
      }
    } else {
      console.log('[finalize-onboarding] No fulfillment order found awaiting onboarding (may be test/grandfathered user)');
    }

    // Build URLs
    const hubUrl = `https://tapaway-review.lovable.app/${restaurant.custom_slug}`;
    const dashboardUrl = 'https://tapaway-review.lovable.app/dashboard';

    // Email configuration
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
    const emailInternal = Deno.env.get('EMAIL_INTERNAL') || 'tap@tapaway.co';
    const customerEmail = restaurant.email || user.email;
    const ownerName = restaurant.owner_name || 'there';
    const restaurantName = restaurant.restaurant_name;
    
    // Order details from fulfillment or defaults
    const planName = fulfillmentOrder?.plan || restaurant.plan_type || 'TapAway';
    const cardsQty = fulfillmentOrder?.quantity || 15;
    const stripeReceiptUrl = (fulfillmentOrder as any)?.stripe_receipt_url || null;
    const shippingEta = '3–5 business days';
    const logoUrl = TAPAWAY_LOGO_URL;

    let customerEmailSent = false;
    let internalEmailSent = false;

    // Send branded customer welcome email
    if (customerEmail) {
      const customerHtml = `
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

      const customerText = `
Welcome to TapAway, ${ownerName}!

Your restaurant "${restaurantName}" is now live.

Plan: ${planName}
Cards: ${cardsQty}
Shipping: ${shippingEta}

${stripeReceiptUrl ? `Stripe receipt: ${stripeReceiptUrl}\n\n` : ''}
Dashboard:
${dashboardUrl}

Questions? Email tap@tapaway.co

– TapAway
`;

      customerEmailSent = await sendEmail({
        to: customerEmail,
        from: emailFrom,
        subject: 'Welcome to TapAway – your cards are on the way 🎉',
        html: customerHtml,
        text: customerText,
      });
    }

    // Send internal fulfillment email if we have a fulfillment order
    if (fulfillmentOrder) {
      const shippingInfo = [
        fulfillmentOrder.shipping_name,
        fulfillmentOrder.shipping_address_line1,
        fulfillmentOrder.shipping_address_line2,
        [fulfillmentOrder.shipping_city, fulfillmentOrder.shipping_state, fulfillmentOrder.shipping_postal_code].filter(Boolean).join(', '),
        fulfillmentOrder.shipping_country,
      ].filter(Boolean).join('<br>');

      const internalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New TapAway Order</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #0d9488; margin-top: 0;">📦 New TapAway Order – Ready to Ship</h1>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Restaurant</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${restaurant.restaurant_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Owner</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${restaurant.owner_name || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${customerEmail || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Plan</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${fulfillmentOrder.plan || restaurant.plan_type || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Quantity</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${fulfillmentOrder.quantity} cards</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Hub URL</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="${hubUrl}" style="color: #0d9488;">${hubUrl}</a></td>
      </tr>
    </table>
    
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="color: #92400e; margin: 0 0 8px 0;">📍 Shipping Address</h3>
      <p style="color: #78350f; margin: 0; line-height: 1.6;">
        ${shippingInfo || 'No shipping address provided'}
      </p>
    </div>
    
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h4 style="color: #374151; margin: 0 0 8px 0;">Stripe IDs</h4>
      <p style="color: #6b7280; font-size: 12px; margin: 0; word-break: break-all;">
        Customer: ${fulfillmentOrder.stripe_customer_id || 'N/A'}<br>
        Subscription: ${fulfillmentOrder.stripe_subscription_id || 'N/A'}<br>
        Payment Intent: ${fulfillmentOrder.stripe_payment_intent_id || 'N/A'}<br>
        Fulfillment Order ID: ${fulfillmentOrder.id}
      </p>
    </div>
    
    <p style="background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600;">
      ✅ Status: PENDING (Ready to Ship)
    </p>
  </div>
</body>
</html>`;

      internalEmailSent = await sendEmail({
        to: emailInternal,
        from: emailFrom,
        subject: `New TapAway Order – ${restaurant.restaurant_name} (${fulfillmentOrder.quantity} cards)`,
        html: internalHtml,
      });
    }

    console.log('[finalize-onboarding] Complete:', {
      restaurantId: restaurant.id,
      fulfillmentUpdated,
      customerEmailSent,
      internalEmailSent,
    });

    return new Response(JSON.stringify({
      success: true,
      fulfillmentUpdated,
      customerEmailSent,
      internalEmailSent,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[finalize-onboarding] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200, // Return 200 to not break frontend
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
