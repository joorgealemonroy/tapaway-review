import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email sending helper
async function sendEmail(options: {
  to: string;
  from: string;
  subject: string;
  html: string;
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

    // Build hub URL
    const hubUrl = `https://tapaway-review.lovable.app/${restaurant.custom_slug}`;
    const dashboardUrl = 'https://tapaway-review.lovable.app/dashboard';

    // Email configuration
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
    const emailInternal = Deno.env.get('EMAIL_INTERNAL') || 'tap@tapaway.co';
    const customerEmail = restaurant.email || user.email;
    const ownerName = restaurant.owner_name || 'there';

    let customerEmailSent = false;
    let internalEmailSent = false;

    // Send customer welcome email
    if (customerEmail) {
      const customerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TapAway</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #0d9488; margin-top: 0;">Welcome to TapAway! 🎉</h1>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${ownerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      Congratulations! Your TapAway account is all set up. Here's what happens next:
    </p>
    
    <div style="background: #f0fdfa; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #0d9488; margin-top: 0;">📦 What happens next</h3>
      <ul style="color: #374151; padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 8px;">We're preparing your 15 TapAway NFC cards</li>
        <li style="margin-bottom: 8px;">Cards will ship within 2-3 business days</li>
        <li style="margin-bottom: 8px;">You can customize your hub anytime from your dashboard</li>
      </ul>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>Your TapAway Hub:</strong><br>
      <a href="${hubUrl}" style="color: #0d9488; text-decoration: none;">${hubUrl}</a>
    </p>
    
    <a href="${dashboardUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
      Go to Dashboard
    </a>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
      Need help? Reply to this email or contact <a href="mailto:support@tapaway.co" style="color: #0d9488;">support@tapaway.co</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      TapAway — Turn every visit into a Google review<br>
      <a href="https://tapaway.co" style="color: #9ca3af;">tapaway.co</a>
    </p>
  </div>
</body>
</html>`;

      customerEmailSent = await sendEmail({
        to: customerEmail,
        from: emailFrom,
        subject: `Welcome to TapAway, ${restaurant.restaurant_name} 🎉`,
        html: customerHtml,
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
