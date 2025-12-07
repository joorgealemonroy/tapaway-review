import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log('[finalize-onboarding] Sending email to:', options.to, 'subject:', options.subject);
    
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

// TapAway logo hosted on imgur - cropped version
const LOGO_URL = 'https://i.imgur.com/bc1EJv8.png';

// Generate branded welcome email HTML
function generateWelcomeEmailHtml(params: {
  ownerName: string;
  restaurantName: string;
  dashboardUrl: string;
  planName: string;
  cardsQty: number;
  stripeReceiptUrl: string | null;
  shippingEta: string;
}): string {
  const { ownerName, restaurantName, dashboardUrl, planName, cardsQty, stripeReceiptUrl, shippingEta } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TapAway</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdfa;padding:40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Main card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(13,148,136,0.12);">
          
          <!-- Header with logo - white background -->
          <tr>
            <td style="background:#ffffff;padding:32px 32px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="TapAway" width="200" style="height:auto;max-width:200px;display:block;margin:0 auto;" />
            </td>
          </tr>
          
          <!-- Gradient welcome banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#14b8a6 50%,#2dd4bf 100%);padding:32px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3;">
                      Welcome aboard, ${ownerName}! <span style="font-size:28px;">🎉</span>
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.9);">
                      You're all set to collect 5-star reviews
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body content -->
          <tr>
            <td style="padding:32px;">
              
              <!-- Restaurant name callout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%);border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top">
                          <span style="font-size:24px;">🏪</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:13px;color:#0d9488;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Restaurant</p>
                          <p style="margin:4px 0 0 0;font-size:20px;font-weight:700;color:#134e4a;">${restaurantName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Order summary -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #e5e7eb;border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #f3f4f6;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">📦 Your Order</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size:14px;color:#6b7280;">Plan</td>
                              <td align="right" style="font-size:14px;font-weight:600;color:#111827;">${planName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size:14px;color:#6b7280;">NFC Review Cards</td>
                              <td align="right" style="font-size:14px;font-weight:600;color:#0d9488;">${cardsQty} cards</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size:14px;color:#6b7280;">Shipping</td>
                              <td align="right" style="font-size:14px;font-weight:600;color:#111827;">${shippingEta}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${stripeReceiptUrl ? `
                <tr>
                  <td style="padding:12px 24px 16px;border-top:1px solid #f3f4f6;">
                    <a href="${stripeReceiptUrl}" style="font-size:13px;color:#0d9488;text-decoration:underline;">View payment receipt →</a>
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);color:#ffffff;padding:16px 40px;border-radius:999px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(13,148,136,0.4);">
                      Open My Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- What happens next -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#111827;">✨ What happens next</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="top" style="font-size:14px;font-weight:700;color:#0d9488;">1.</td>
                              <td style="font-size:14px;color:#4b5563;line-height:1.5;">We prepare and print your custom NFC TapAway cards</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="top" style="font-size:14px;font-weight:700;color:#0d9488;">2.</td>
                              <td style="font-size:14px;color:#4b5563;line-height:1.5;">We ship them to the address you provided at checkout</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="top" style="font-size:14px;font-weight:700;color:#0d9488;">3.</td>
                              <td style="font-size:14px;color:#4b5563;line-height:1.5;">Place them at your restaurant and watch the reviews roll in!</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Support -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e7eb;padding-top:24px;">
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:14px;color:#6b7280;">
                      Questions? We're here to help!
                    </p>
                    <p style="margin:8px 0 0 0;">
                      <a href="mailto:tap@tapaway.co" style="font-size:14px;color:#0d9488;font-weight:600;text-decoration:none;">tap@tapaway.co</a>
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you created a TapAway account for <strong>${restaurantName}</strong>
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">
                <a href="https://tapaway.co" style="color:#0d9488;text-decoration:none;">tapaway.co</a> · Turn every visit into a Google review
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`;
}

// Generate plain text version
function generateWelcomeEmailText(params: {
  ownerName: string;
  restaurantName: string;
  dashboardUrl: string;
  planName: string;
  cardsQty: number;
  stripeReceiptUrl: string | null;
  shippingEta: string;
}): string {
  const { ownerName, restaurantName, dashboardUrl, planName, cardsQty, stripeReceiptUrl, shippingEta } = params;
  
  return `
🎉 Welcome to TapAway, ${ownerName}!

Your restaurant "${restaurantName}" is now set up and ready to collect 5-star reviews.

📦 YOUR ORDER
• Plan: ${planName}
• NFC Review Cards: ${cardsQty}
• Shipping: ${shippingEta}

${stripeReceiptUrl ? `View receipt: ${stripeReceiptUrl}\n` : ''}
✨ WHAT HAPPENS NEXT
1. We prepare and print your custom NFC TapAway cards
2. We ship them to the address you provided at checkout
3. Place them at your restaurant and watch the reviews roll in!

👉 Open your dashboard: ${dashboardUrl}

Questions? Email us at tap@tapaway.co

– The TapAway Team
`;
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
      .select('id, restaurant_name, custom_slug, owner_name, email, plan_type, stripe_customer_id')
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

    // Find fulfillment order - check ALL statuses, not just awaiting_onboarding
    // This handles cases where the order might have been created differently
    const { data: fulfillmentOrder, error: fulfillmentError } = await supabaseAdmin
      .from('fulfillment_orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurant.id)
      .in('status', ['awaiting_onboarding', 'pending', 'created'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fulfillmentError) {
      console.error('[finalize-onboarding] Fulfillment query error:', fulfillmentError);
    }

    // CRITICAL: If no fulfillment order exists, try to create one from Stripe data
    let actualFulfillmentOrder = fulfillmentOrder;
    
    if (!actualFulfillmentOrder && restaurant.stripe_customer_id) {
      console.log('[finalize-onboarding] No fulfillment order found, attempting to create from Stripe customer:', restaurant.stripe_customer_id);
      
      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
          apiVersion: '2023-10-16',
        });

        const stripeCustomer = await stripe.customers.retrieve(restaurant.stripe_customer_id);
        
        let shippingName: string | null = null;
        let shippingAddress: any = null;
        
        if (stripeCustomer && 'shipping' in stripeCustomer && stripeCustomer.shipping?.address) {
          console.log('[finalize-onboarding] Found shipping from Stripe customer');
          shippingName = stripeCustomer.shipping.name || (stripeCustomer as any).name || null;
          shippingAddress = stripeCustomer.shipping.address;
        } else if (stripeCustomer && 'address' in stripeCustomer && stripeCustomer.address) {
          console.log('[finalize-onboarding] Using Stripe customer address as shipping');
          shippingName = (stripeCustomer as any).name || null;
          shippingAddress = stripeCustomer.address;
        }

        // Get subscription info
        let subscriptionId: string | null = null;
        if ('subscriptions' in stripeCustomer) {
          const subscriptions = await stripe.subscriptions.list({
            customer: restaurant.stripe_customer_id,
            status: 'active',
            limit: 1,
          });
          if (subscriptions.data.length > 0) {
            subscriptionId = subscriptions.data[0].id;
          }
        }

        // Create the fulfillment order
        const { data: newFulfillment, error: createFulfillmentError } = await supabaseAdmin
          .from('fulfillment_orders')
          .insert({
            user_id: user.id,
            restaurant_id: restaurant.id,
            stripe_customer_id: restaurant.stripe_customer_id,
            stripe_subscription_id: subscriptionId,
            plan: restaurant.plan_type || 'monthly',
            quantity: 15,
            status: 'awaiting_onboarding',
            shipping_name: shippingName,
            shipping_address_line1: shippingAddress?.line1 || null,
            shipping_address_line2: shippingAddress?.line2 || null,
            shipping_city: shippingAddress?.city || null,
            shipping_state: shippingAddress?.state || null,
            shipping_postal_code: shippingAddress?.postal_code || null,
            shipping_country: shippingAddress?.country || null,
          })
          .select('*')
          .single();

        if (createFulfillmentError) {
          console.error('[finalize-onboarding] Failed to create fulfillment order:', createFulfillmentError);
        } else {
          console.log('[finalize-onboarding] Created fulfillment order from Stripe:', newFulfillment?.id);
          actualFulfillmentOrder = newFulfillment;
        }
      } catch (stripeError) {
        console.error('[finalize-onboarding] Error fetching Stripe customer:', stripeError);
      }
    }

    let fulfillmentUpdated = false;
    if (actualFulfillmentOrder) {
      // Update status to pending
      const { error: updateError } = await supabaseAdmin
        .from('fulfillment_orders')
        .update({ status: 'pending' })
        .eq('id', actualFulfillmentOrder.id);

      if (updateError) {
        console.error('[finalize-onboarding] Failed to update fulfillment status:', updateError);
      } else {
        fulfillmentUpdated = true;
        console.log('[finalize-onboarding] Fulfillment order updated to pending:', actualFulfillmentOrder.id);
      }
    } else {
      console.warn('[finalize-onboarding] WARNING: No fulfillment order found or created! User may not receive cards.');
    }

    // Build URLs - Production domain
    const hubUrl = `https://tapaway.co/${restaurant.custom_slug}`;
    const dashboardUrl = 'https://tapaway.co/dashboard';

    // Email configuration
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'TapAway <no-reply@tapaway.co>';
    const emailInternal = Deno.env.get('EMAIL_INTERNAL') || 'tap@tapaway.co';
    const customerEmail = restaurant.email || user.email;
    const ownerName = restaurant.owner_name || 'there';
    const restaurantName = restaurant.restaurant_name;
    
    // Order details from fulfillment or defaults
    const planName = actualFulfillmentOrder?.plan || restaurant.plan_type || 'TapAway';
    const cardsQty = actualFulfillmentOrder?.quantity || 15;
    const stripeReceiptUrl = (actualFulfillmentOrder as any)?.stripe_receipt_url || null;
    const shippingEta = '3–5 business days';

    let customerEmailSent = false;
    let internalEmailSent = false;

    // Send branded customer welcome email
    if (customerEmail) {
      const customerHtml = generateWelcomeEmailHtml({
        ownerName,
        restaurantName,
        dashboardUrl,
        planName,
        cardsQty,
        stripeReceiptUrl,
        shippingEta,
      });

      const customerText = generateWelcomeEmailText({
        ownerName,
        restaurantName,
        dashboardUrl,
        planName,
        cardsQty,
        stripeReceiptUrl,
        shippingEta,
      });

      customerEmailSent = await sendEmail({
        to: customerEmail,
        from: emailFrom,
        subject: '🎉 Welcome to TapAway – Your cards are on the way!',
        html: customerHtml,
        text: customerText,
      });
      
      if (!customerEmailSent) {
        console.error('[finalize-onboarding] FAILED to send customer welcome email to:', customerEmail);
      }
    } else {
      console.warn('[finalize-onboarding] No customer email available!');
    }

    // Send internal fulfillment email - ALWAYS send even if no fulfillment order (as alert)
    const shippingInfo = actualFulfillmentOrder ? [
      actualFulfillmentOrder.shipping_name,
      actualFulfillmentOrder.shipping_address_line1,
      actualFulfillmentOrder.shipping_address_line2,
      [actualFulfillmentOrder.shipping_city, actualFulfillmentOrder.shipping_state, actualFulfillmentOrder.shipping_postal_code].filter(Boolean).join(', '),
      actualFulfillmentOrder.shipping_country,
    ].filter(Boolean).join('<br>') : null;

    const warningBanner = !shippingInfo ? `
    <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin: 0 0 8px 0;">⚠️ MISSING SHIPPING ADDRESS</h3>
      <p style="color: #991b1b; margin: 0;">
        This order does not have a shipping address! Please contact the customer immediately at ${customerEmail} to get their shipping address.
      </p>
    </div>
    ` : '';

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
    
    ${warningBanner}
    
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
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${actualFulfillmentOrder?.plan || restaurant.plan_type || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Quantity</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${actualFulfillmentOrder?.quantity || 15} cards</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Hub URL</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><a href="${hubUrl}" style="color: #0d9488;">${hubUrl}</a></td>
      </tr>
    </table>
    
    <div style="background: ${shippingInfo ? '#fef3c7' : '#fee2e2'}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="color: ${shippingInfo ? '#92400e' : '#dc2626'}; margin: 0 0 8px 0;">📍 Shipping Address</h3>
      <p style="color: ${shippingInfo ? '#78350f' : '#991b1b'}; margin: 0; line-height: 1.6;">
        ${shippingInfo || 'NO SHIPPING ADDRESS PROVIDED - CONTACT CUSTOMER!'}
      </p>
    </div>
    
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h4 style="color: #374151; margin: 0 0 8px 0;">Stripe IDs</h4>
      <p style="color: #6b7280; font-size: 12px; margin: 0; word-break: break-all;">
        Customer: ${actualFulfillmentOrder?.stripe_customer_id || restaurant.stripe_customer_id || 'N/A'}<br>
        Subscription: ${actualFulfillmentOrder?.stripe_subscription_id || 'N/A'}<br>
        Payment Intent: ${actualFulfillmentOrder?.stripe_payment_intent_id || 'N/A'}<br>
        Fulfillment Order ID: ${actualFulfillmentOrder?.id || 'NOT CREATED'}
      </p>
    </div>
    
    <p style="background: ${shippingInfo ? '#dcfce7' : '#fef3c7'}; color: ${shippingInfo ? '#166534' : '#92400e'}; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600;">
      ${shippingInfo ? '✅ Status: PENDING (Ready to Ship)' : '⚠️ Status: ACTION REQUIRED - Need Shipping Address'}
    </p>
  </div>
</body>
</html>`;

    internalEmailSent = await sendEmail({
      to: emailInternal,
      from: emailFrom,
      subject: `${shippingInfo ? '📦' : '⚠️'} New TapAway Order – ${restaurant.restaurant_name} (${actualFulfillmentOrder?.quantity || 15} cards)${!shippingInfo ? ' - MISSING ADDRESS' : ''}`,
      html: internalHtml,
    });
    
    if (!internalEmailSent) {
      console.error('[finalize-onboarding] FAILED to send internal notification email!');
    }

    console.log('[finalize-onboarding] Complete:', {
      restaurantId: restaurant.id,
      fulfillmentUpdated,
      customerEmailSent,
      internalEmailSent,
      hasShippingAddress: !!shippingInfo,
    });

    return new Response(JSON.stringify({
      success: true,
      fulfillmentUpdated,
      customerEmailSent,
      internalEmailSent,
      hasShippingAddress: !!shippingInfo,
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
