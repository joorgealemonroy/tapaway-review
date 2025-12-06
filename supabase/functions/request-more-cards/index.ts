import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CARDS_PER_MONTH = 10;

// Email sending helper
async function sendInternalEmail(options: {
  subject: string;
  html: string;
}): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
  const emailInternal = Deno.env.get('EMAIL_INTERNAL') || 'tap@tapaway.co';

  if (!resendApiKey) {
    console.error('[request-more-cards] RESEND_API_KEY not configured');
    return false;
  }

  console.log('[request-more-cards] Sending email to:', emailInternal);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailInternal,
        from: emailFrom,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[request-more-cards] Resend API error:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('[request-more-cards] Internal email sent successfully, id:', result.id);
    return true;
  } catch (error) {
    console.error('[request-more-cards] Email send failed:', error);
    return false;
  }
}

// Get current month date range (start of month to now)
function getCurrentMonthRange(): { startOfMonth: string; now: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startOfMonth: startOfMonth.toISOString(),
    now: now.toISOString(),
  };
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
      return new Response(JSON.stringify({ success: false, error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { quantity = 5, restaurantId } = await req.json().catch(() => ({}));

    console.log('[request-more-cards] Request from user:', user.id, 'quantity:', quantity, 'restaurantId:', restaurantId);

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 1 || quantity > MAX_CARDS_PER_MONTH) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Quantity must be between 1 and ${MAX_CARDS_PER_MONTH}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const isAdmin = user.email === 'tap@tapaway.co';

    // Find the restaurant - admins can access any restaurant, owners only their own
    let restaurantQuery = supabaseAdmin
      .from('restaurants')
      .select('id, restaurant_name, owner_name, email, plan_type, custom_slug');
    
    if (restaurantId) {
      restaurantQuery = restaurantQuery.eq('id', restaurantId);
    }
    
    // Non-admins can only access their own restaurants
    if (!isAdmin) {
      restaurantQuery = restaurantQuery.eq('owner_id', user.id);
    }

    const { data: restaurant, error: restaurantError } = await restaurantQuery.maybeSingle();

    if (restaurantError || !restaurant) {
      console.error('[request-more-cards] Restaurant not found:', restaurantError);
      return new Response(JSON.stringify({ success: false, error: 'Restaurant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[request-more-cards] Found restaurant:', restaurant.restaurant_name, 'isAdmin:', isAdmin);

    // Check monthly limit: sum of addon orders this month
    const { startOfMonth } = getCurrentMonthRange();
    
    const { data: monthlyOrders, error: monthlyError } = await supabaseAdmin
      .from('fulfillment_orders')
      .select('quantity')
      .eq('restaurant_id', restaurant.id)
      .eq('plan', 'addon')
      .gte('created_at', startOfMonth);

    if (monthlyError) {
      console.error('[request-more-cards] Error checking monthly orders:', monthlyError);
    }

    const totalRequestedThisMonth = (monthlyOrders || []).reduce((sum, order) => sum + (order.quantity || 0), 0);
    const remainingAllowance = MAX_CARDS_PER_MONTH - totalRequestedThisMonth;

    console.log('[request-more-cards] Monthly usage:', totalRequestedThisMonth, 'Remaining:', remainingAllowance, 'Requested:', quantity);

    if (remainingAllowance <= 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `You've already requested ${MAX_CARDS_PER_MONTH} cards this month. Your limit resets next month.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (quantity > remainingAllowance) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `You can only request ${remainingAllowance} more card${remainingAllowance === 1 ? '' : 's'} this month.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find existing fulfillment order for shipping info
    const { data: existingOrder } = await supabaseAdmin
      .from('fulfillment_orders')
      .select('plan, shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create new fulfillment order for addon
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('fulfillment_orders')
      .insert({
        user_id: user.id,
        restaurant_id: restaurant.id,
        plan: 'addon',
        quantity: quantity,
        status: 'pending',
        // Copy shipping from existing order if available
        shipping_name: existingOrder?.shipping_name || null,
        shipping_address_line1: existingOrder?.shipping_address_line1 || null,
        shipping_address_line2: existingOrder?.shipping_address_line2 || null,
        shipping_city: existingOrder?.shipping_city || null,
        shipping_state: existingOrder?.shipping_state || null,
        shipping_postal_code: existingOrder?.shipping_postal_code || null,
        shipping_country: existingOrder?.shipping_country || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[request-more-cards] Insert error:', insertError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[request-more-cards] Created fulfillment order:', newOrder.id);

    // Build shipping info string
    const shippingInfo = [
      existingOrder?.shipping_name,
      existingOrder?.shipping_address_line1,
      existingOrder?.shipping_address_line2,
      [existingOrder?.shipping_city, existingOrder?.shipping_state, existingOrder?.shipping_postal_code].filter(Boolean).join(', '),
      existingOrder?.shipping_country,
    ].filter(Boolean).join('<br>') || 'No shipping address on file — please confirm with customer';

    // Send internal notification email to tap@tapaway.co
    const internalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Card Reorder Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #7c3aed; margin-top: 0;">🔄 Card Reorder Request</h1>
    
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
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${restaurant.email || user.email}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Plan</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${restaurant.plan_type || existingOrder?.plan || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Requested Quantity</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600; font-size: 18px;">${quantity} cards</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Monthly Usage</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${totalRequestedThisMonth + quantity}/${MAX_CARDS_PER_MONTH} cards used this month</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Hub URL</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="https://tapaway-review.lovable.app/${restaurant.custom_slug}" style="color: #0d9488;">tapaway-review.lovable.app/${restaurant.custom_slug}</a></td>
      </tr>
    </table>
    
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="color: #92400e; margin: 0 0 8px 0;">📍 Last Known Shipping Address</h3>
      <p style="color: #78350f; margin: 0; line-height: 1.6;">
        ${shippingInfo}
      </p>
    </div>
    
    <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #991b1b; margin: 0; font-weight: 600;">
        ⚠️ This is a manual add-on request. Invoice and ship as appropriate.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 12px;">
      Fulfillment Order ID: ${newOrder.id}
    </p>
  </div>
</body>
</html>`;

    const emailSent = await sendInternalEmail({
      subject: `Card Reorder Request – ${restaurant.restaurant_name} (${quantity} cards)`,
      html: internalHtml,
    });

    console.log('[request-more-cards] Email sent:', emailSent);

    return new Response(JSON.stringify({
      success: true,
      orderId: newOrder.id,
      emailSent,
      monthlyUsage: {
        used: totalRequestedThisMonth + quantity,
        limit: MAX_CARDS_PER_MONTH,
        remaining: remainingAllowance - quantity,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[request-more-cards] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
