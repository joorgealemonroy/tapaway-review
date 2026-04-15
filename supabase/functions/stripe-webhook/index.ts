import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Hardcoded fallback - NEVER use supabaseUrl for portal return
const DEFAULT_PORTAL_RETURN_URL = 'https://tapaway.co/dashboard';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[stripe-webhook] No stripe-signature header found');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      // CRITICAL: Must use constructEventAsync for Deno runtime
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
    } catch (err) {
      console.error('[stripe-webhook] Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[stripe-webhook] Received event:', event.type);

if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('[stripe-webhook] Processing checkout session:', {
        id: session.id,
        customer: session.customer,
        customer_email: session.customer_email,
        subscription: session.subscription,
        metadata: session.metadata,
        shipping_details: (session as any).shipping_details,
        shipping: (session as any).shipping,
        customer_details: session.customer_details,
      });

      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const paymentIntentId = (session as any).payment_intent as string || null;
      
      // Get metadata
      const metadataUserId = session.metadata?.user_id || null;
      const metadataRestaurantId = session.metadata?.restaurant_id || null;
      const metadataPlan = session.metadata?.plan_type || 'monthly';
      
      // Sales rep portal metadata
      const salesRepId = session.metadata?.sales_rep_id || null;
      const repRestaurantId = session.metadata?.rep_restaurant_id || null;
      const source = session.metadata?.source || null;
      
      if (!customerEmail) {
        console.error('[stripe-webhook] No customer email in session - checking Stripe customer');
        // Try to get email from Stripe customer
        if (customerId) {
          const stripeCustomer = await stripe.customers.retrieve(customerId);
          if (stripeCustomer && 'email' in stripeCustomer && stripeCustomer.email) {
            console.log('[stripe-webhook] Found email from Stripe customer:', stripeCustomer.email);
          }
        }
        
        if (!customerEmail) {
          console.error('[stripe-webhook] Could not find customer email anywhere');
          return new Response(JSON.stringify({ error: 'No customer email' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Create Supabase admin client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
        mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      );

      // Get or create user
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      let userId = metadataUserId || existingUser?.users.find(u => u.email === customerEmail)?.id;

      if (!userId) {
        // Create new user with a random password and mark them as needing to set password
        const randomPassword = crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: customerEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            must_set_password: true,
          },
        });

        if (createError) {
          console.error('[stripe-webhook] Failed to create user:', createError);
          return new Response(JSON.stringify({ error: 'Failed to create user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        userId = newUser.user.id;
        console.log('[stripe-webhook] Created new user with must_set_password flag:', userId);
      }

      // Determine plan type (only monthly or yearly, no bundles)
      let planType = metadataPlan;

      // Get the price ID from the session to determine plan (fallback)
      if (subscriptionId && !metadataPlan) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        
        // Map price IDs to plan types (only monthly or yearly)
        if (priceId?.includes('year')) {
          planType = 'yearly';
        } else {
          planType = 'monthly';
        }
      }

      console.log(`[stripe-webhook] Creating restaurant for plan: ${planType}`);

      // Get user metadata for greeting_name if available
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const greetingName = userData?.user?.user_metadata?.greeting_name || null;

      // Check if restaurant already exists for this user
      const { data: existingRestaurant } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      let restaurantId = metadataRestaurantId || existingRestaurant?.id;

      // CRITICAL: Create/update restaurant FIRST, before trying billing portal
      if (existingRestaurant) {
        // Update existing restaurant (without portal URL initially)
        const updateData: any = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_type: planType,
          subscription_status: 'active',
        };
        
        // Link sales rep if this came from rep portal
        if (salesRepId) {
          updateData.sales_rep_id = salesRepId;
        }
        
        const { error: updateError } = await supabaseAdmin
          .from('restaurants')
          .update(updateData)
          .eq('id', existingRestaurant.id);

        if (updateError) {
          console.error('[stripe-webhook] Failed to update restaurant:', updateError);
        } else {
          console.log('[stripe-webhook] Updated existing restaurant:', existingRestaurant.id);
          restaurantId = existingRestaurant.id;
        }
      } else {
        // Create new restaurant record (without portal URL initially)
        const insertData: any = {
          owner_id: userId,
          restaurant_name: session.metadata?.restaurant_name || 'My Restaurant',
          greeting_name: greetingName,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_type: planType,
          subscription_status: 'active',
          header_title: "How was your visit?",
          header_subtitle: "We'd love to hear about your experience!",
          menu_title: "Our Menu",
        };
        
        // Link sales rep if this came from rep portal
        if (salesRepId) {
          insertData.sales_rep_id = salesRepId;
        }
        
        const { data: newRestaurant, error: insertError } = await supabaseAdmin
          .from('restaurants')
          .insert(insertData)
          .select('id')
          .single();

        if (insertError) {
          console.error('[stripe-webhook] Failed to create restaurant:', insertError);
        } else {
          console.log('[stripe-webhook] Created restaurant successfully:', newRestaurant?.id);
          restaurantId = newRestaurant?.id;
        }
      }

      // NOW try to get customer portal URL (non-blocking - wrapped in try/catch)
      let portalUrl: string | null = null;
      try {
        const portalReturnUrl = Deno.env.get('STRIPE_PORTAL_RETURN_URL') || DEFAULT_PORTAL_RETURN_URL;
        console.log('[stripe-webhook] Creating billing portal with return URL:', portalReturnUrl);
        
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: portalReturnUrl,
        });
        portalUrl = portalSession.url;
        
        // Update restaurant with portal URL
        if (restaurantId && portalUrl) {
          await supabaseAdmin
            .from('restaurants')
            .update({ stripe_portal_url: portalUrl })
            .eq('id', restaurantId);
          console.log('[stripe-webhook] Updated restaurant with portal URL');
        }
      } catch (portalError) {
        console.error('[stripe-webhook] Failed to create billing portal (non-fatal):', portalError);
        // This is non-fatal - restaurant was already created
      }

      // CRITICAL: Extract shipping details from ALL possible Stripe locations
      // Stripe can put shipping in different places depending on checkout config
      const sessionAny = session as any;
      let shippingName: string | null = null;
      let shippingAddress: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      } | null = null;

      // Try all possible locations for shipping details
      if (sessionAny.shipping_details?.address) {
        console.log('[stripe-webhook] Found shipping in shipping_details');
        shippingName = sessionAny.shipping_details.name;
        shippingAddress = sessionAny.shipping_details.address;
      } else if (sessionAny.shipping?.address) {
        console.log('[stripe-webhook] Found shipping in shipping');
        shippingName = sessionAny.shipping.name;
        shippingAddress = sessionAny.shipping.address;
      } else if (session.customer_details?.address) {
        console.log('[stripe-webhook] Using customer_details address as shipping');
        shippingName = session.customer_details.name;
        shippingAddress = session.customer_details.address;
      }

      // If still no shipping, try fetching from Stripe customer directly
      if (!shippingAddress && customerId) {
        console.log('[stripe-webhook] Attempting to fetch shipping from Stripe customer');
        try {
          const stripeCustomer = await stripe.customers.retrieve(customerId);
          if (stripeCustomer && 'shipping' in stripeCustomer && stripeCustomer.shipping?.address) {
            console.log('[stripe-webhook] Found shipping from Stripe customer record');
            shippingName = stripeCustomer.shipping.name || stripeCustomer.name || null;
            shippingAddress = stripeCustomer.shipping.address;
          } else if (stripeCustomer && 'address' in stripeCustomer && stripeCustomer.address) {
            console.log('[stripe-webhook] Using Stripe customer address as shipping');
            shippingName = (stripeCustomer as any).name || null;
            shippingAddress = stripeCustomer.address;
          }
        } catch (customerFetchError) {
          console.error('[stripe-webhook] Error fetching Stripe customer:', customerFetchError);
        }
      }

      console.log('[stripe-webhook] Final shipping data:', {
        shippingName,
        shippingAddress,
      });

      // Create fulfillment order if we have a restaurant
      if (restaurantId) {
        // Check for existing fulfillment order
        const { data: existingFulfillment } = await supabaseAdmin
          .from('fulfillment_orders')
          .select('id')
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId)
          .in('status', ['awaiting_onboarding', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const fulfillmentData = {
          user_id: userId,
          restaurant_id: restaurantId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_payment_intent_id: paymentIntentId,
          plan: planType,
          quantity: 15,
          status: 'awaiting_onboarding',
          shipping_name: shippingName,
          shipping_address_line1: shippingAddress?.line1 || null,
          shipping_address_line2: shippingAddress?.line2 || null,
          shipping_city: shippingAddress?.city || null,
          shipping_state: shippingAddress?.state || null,
          shipping_postal_code: shippingAddress?.postal_code || null,
          shipping_country: shippingAddress?.country || null,
        };

        console.log('[stripe-webhook] Fulfillment data to save:', fulfillmentData);

        if (existingFulfillment) {
          // Update existing fulfillment order
          const { error: fulfillmentUpdateError } = await supabaseAdmin
            .from('fulfillment_orders')
            .update(fulfillmentData)
            .eq('id', existingFulfillment.id);

          if (fulfillmentUpdateError) {
            console.error('[stripe-webhook] Failed to update fulfillment order:', fulfillmentUpdateError);
          } else {
            console.log('[stripe-webhook] Updated fulfillment order:', existingFulfillment.id);
          }
        } else {
          // Create new fulfillment order
          const { data: newFulfillment, error: fulfillmentInsertError } = await supabaseAdmin
            .from('fulfillment_orders')
            .insert(fulfillmentData)
            .select('id')
            .single();

          if (fulfillmentInsertError) {
            console.error('[stripe-webhook] Failed to create fulfillment order:', fulfillmentInsertError);
          } else {
            console.log('[stripe-webhook] Created fulfillment order:', newFulfillment?.id);
          }
        }

        // CRITICAL: If we have all the data we need, send emails NOW from the webhook
        // This is a backup in case finalize-onboarding never gets called
        if (shippingAddress?.line1 && customerEmail) {
          console.log('[stripe-webhook] Shipping address available - scheduling immediate email fallback');
          // We don't send emails here because finalize-onboarding should handle it
          // But we log this so we know the data was captured
        } else {
          console.warn('[stripe-webhook] WARNING: No shipping address captured! Customer:', customerEmail);
        }
      }

      // ============================================================
      // SALES REP COMMISSION HANDLING — TRIAL-SAFE
      // Create commission as trial_pending with 0 points.
      // Real activation happens in invoice.paid handler.
      // ============================================================
      if (salesRepId && restaurantId && source === 'rep_portal') {
        console.log(`[stripe-webhook] Processing sales rep commission (trial_pending) for rep ${salesRepId}`);
        
        try {
          // Get compensation settings for tiered rates
          const { data: compSettings } = await supabaseAdmin
            .from('rep_compensation_settings')
            .select('*')
            .limit(1)
            .single();

          const metaPlanTier = session.metadata?.plan_tier || 'restaurant';
          const metaBillingCycle = session.metadata?.billing_cycle || 'monthly';

          // Determine upfront amount based on tier
          let upfrontAmount = 50; // fallback
          if (compSettings) {
            if (metaPlanTier === 'business_lite') {
              upfrontAmount = metaBillingCycle === 'annual'
                ? Number(compSettings.lite_annual_upfront)
                : Number(compSettings.lite_monthly_upfront);
            } else {
              upfrontAmount = metaBillingCycle === 'annual'
                ? Number(compSettings.restaurant_annual_upfront)
                : Number(compSettings.restaurant_monthly_upfront);
            }
          }

          const now = new Date();
          const periodLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

          // Create commission as trial_pending with 0 points
          const { error: commissionError } = await supabaseAdmin
            .from('commissions')
            .insert({
              rep_id: salesRepId,
              rep_restaurant_id: repRestaurantId || null,
              restaurant_id: restaurantId,
              type: 'close',
              commission_type: 'upfront',
              plan_tier: metaPlanTier,
              billing_cycle: metaBillingCycle,
              amount: upfrontAmount,
              status: 'trial_pending',
              points_value: 0,
              period_label: periodLabel,
              stripe_subscription_id: subscriptionId || null,
              note: `Upfront commission for ${session.metadata?.restaurant_name || 'restaurant'} (${metaPlanTier} ${metaBillingCycle}) — awaiting first payment`,
            });

          if (commissionError) {
            console.error('[stripe-webhook] Failed to create trial_pending commission:', commissionError);
          } else {
            console.log(`[stripe-webhook] Created $${upfrontAmount} trial_pending commission for rep ${salesRepId}`);
          }

          // Update rep_restaurants record to mark as closed
          if (repRestaurantId) {
            const { error: repRestaurantError } = await supabaseAdmin
              .from('rep_restaurants')
              .update({
                status: 'closed',
                closed_at: now.toISOString(),
                plan_type: planType,
                linked_restaurant_id: restaurantId,
              })
              .eq('id', repRestaurantId);

            if (repRestaurantError) {
              console.error('[stripe-webhook] Failed to update rep_restaurant:', repRestaurantError);
            } else {
              console.log('[stripe-webhook] Updated rep_restaurant as closed');
            }
          }
        } catch (commissionErr) {
          console.error('[stripe-webhook] Error processing sales rep commission:', commissionErr);
        }
      }

      // ============================================================
      // PROMO TOKEN BURN — Mark token as used on successful checkout
      // ============================================================
      const promoToken = session.metadata?.promo_token;
      if (promoToken && promoToken.length > 0) {
        try {
          const { error: promoUpdateError } = await supabaseAdmin
            .from('promo_tokens')
            .update({ is_used: true, used_by_user_id: userId })
            .eq('token', promoToken)
            .eq('is_used', false);

          if (promoUpdateError) {
            console.error('[stripe-webhook] Failed to burn promo token:', promoUpdateError);
          } else {
            console.log('[stripe-webhook] Promo token burned:', promoToken);
          }
        } catch (promoErr) {
          console.error('[stripe-webhook] Promo token burn error (non-fatal):', promoErr);
        }
      }

      console.log('[stripe-webhook] Successfully processed checkout session');
    }

    // ============================================================
    // CREATOR MARKETPLACE PURCHASE HANDLING
    // ============================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === 'creator_marketplace' && session.metadata?.product_id) {
        console.log('[stripe-webhook] Processing creator marketplace purchase');
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
          mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        );

        const buyerEmail = session.customer_email || session.customer_details?.email || '';
        const accessToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours

        const { error: insertError } = await supabaseAdmin
          .from('creator_purchases')
          .insert({
            product_id: session.metadata.product_id,
            buyer_email: buyerEmail,
            stripe_session_id: session.id,
            access_token: accessToken,
            access_expires_at: expiresAt,
          });

        if (insertError) {
          console.error('[stripe-webhook] Failed to create purchase record:', insertError);
        } else {
          console.log('[stripe-webhook] Created marketplace purchase with access token');

          // ---- Handle booking confirmation ----
          const bookingId = session.metadata?.booking_id;
          if (bookingId) {
            const { error: bookingUpdateError } = await supabaseAdmin
              .from('bookings')
              .update({ status: 'paid', stripe_session_id: session.id, updated_at: new Date().toISOString() })
              .eq('id', bookingId);

            if (bookingUpdateError) {
              console.error('[stripe-webhook] Failed to update booking status:', bookingUpdateError);
            } else {
              console.log('[stripe-webhook] Booking marked as paid:', bookingId);

              // Send booking confirmation emails
              (async () => {
                try {
                  const resendApiKey = Deno.env.get('RESEND_API_KEY');
                  if (!resendApiKey) return;

                  const emailFromRaw = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
                  const emailFrom = emailFromRaw.includes('<') ? emailFromRaw : `TapAway <${emailFromRaw}>`;

                  // Get booking details
                  const { data: bookingData } = await supabaseAdmin
                    .from('bookings')
                    .select('booking_date, start_time, timezone, buyer_email')
                    .eq('id', bookingId)
                    .single();

                  if (!bookingData) return;

                  const { data: productData } = await supabaseAdmin
                    .from('creator_products')
                    .select('title, duration_minutes, creator_id')
                    .eq('id', session.metadata!.product_id)
                    .single();

                  if (!productData) return;

                  const { data: creatorProfile } = await supabaseAdmin
                    .from('personal_profiles')
                    .select('user_id, username, full_name')
                    .eq('id', productData.creator_id)
                    .single();

                  if (!creatorProfile) return;

                  const { data: creatorUser } = await supabaseAdmin.auth.admin.getUserById(creatorProfile.user_id);
                  const creatorEmail = creatorUser?.user?.email;

                  const dateFormatted = new Date(bookingData.booking_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                  const timeFormatted = bookingData.start_time.slice(0, 5);
                  const tzLabel = (bookingData as any).timezone || 'UTC';

                  // Email to creator
                  if (creatorEmail) {
                    await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        from: emailFrom,
                        to: [creatorEmail],
                        subject: `New Booking! 📅 — ${productData.title}`,
                        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;"><h1 style="font-size:22px;color:#111;">New Booking! 📅</h1><p style="color:#555;font-size:15px;line-height:1.6;"><strong>${(bookingData as any).buyer_email}</strong> has paid and booked:</p><div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0 0 4px;font-weight:600;">${productData.title}</p><p style="margin:0;color:#555;">${dateFormatted} at ${timeFormatted} (${tzLabel})</p><p style="margin:4px 0 0;color:#555;">${productData.duration_minutes || 30} minutes</p></div></div>`,
                      }),
                    });
                    console.log('[stripe-webhook] Booking email sent to creator');
                  }

                  // Email to buyer
                  if ((bookingData as any).buyer_email) {
                    await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        from: emailFrom,
                        to: [(bookingData as any).buyer_email],
                        subject: `Booking Confirmed! 📅 — ${productData.title}`,
                        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;"><h1 style="font-size:22px;color:#111;">Your Booking is Confirmed! ✅</h1><p style="color:#555;font-size:15px;line-height:1.6;">You've booked <strong>${productData.title}</strong> with ${creatorProfile.full_name}.</p><div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0 0 4px;font-weight:600;">${dateFormatted}</p><p style="margin:0;color:#555;">${timeFormatted} (${tzLabel}) · ${productData.duration_minutes || 30} min</p></div><p style="color:#999;font-size:13px;">The creator will reach out with meeting details.</p></div>`,
                      }),
                    });
                    console.log('[stripe-webhook] Booking email sent to buyer');
                  }
                } catch (emailErr) {
                  console.error('[stripe-webhook] Booking email error (non-blocking):', emailErr);
                }
              })();
            }
          }

          // ---- Fire-and-forget: send buyer + creator emails via Resend ----
          (async () => {
            try {
              const resendApiKey = Deno.env.get('RESEND_API_KEY');
              const emailFromRaw = Deno.env.get('EMAIL_FROM') || 'no-reply@tapaway.co';
              const emailFrom = emailFromRaw.includes('<') ? emailFromRaw : `TapAway <${emailFromRaw}>`;
              const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://tapaway.co';

              if (!resendApiKey) {
                console.warn('[stripe-webhook] RESEND_API_KEY not set, skipping emails');
                return;
              }

              // Look up product details for the email
              const { data: product } = await supabaseAdmin
                .from('creator_products')
                .select('title, price_cents, creator_id')
                .eq('id', session.metadata!.product_id)
                .single();

              if (!product) {
                console.error('[stripe-webhook] Product not found for email');
                return;
              }

              const priceFormatted = `$${(product.price_cents / 100).toFixed(2)}`;
              const downloadUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/download-product?token=${accessToken}`;

              // 1. BUYER EMAIL
              if (buyerEmail) {
                const buyerHtml = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
                    <img src="${frontendUrl}/tapaway-logo-email.png" alt="TapAway" style="height: 32px; margin-bottom: 24px;" />
                    <h1 style="font-size: 22px; color: #111; margin: 0 0 8px;">Your purchase is ready!</h1>
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                      Thank you for purchasing <strong>${product.title}</strong> for ${priceFormatted}.
                    </p>
                    <a href="${downloadUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Download Now
                    </a>
                    <p style="color: #999; font-size: 13px; margin-top: 20px;">
                      This download link expires in 72 hours. If you need help, reply to this email.
                    </p>
                  </div>
                `;

                const buyerRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    from: emailFrom,
                    to: [buyerEmail],
                    subject: `Your purchase: ${product.title}`,
                    html: buyerHtml,
                  }),
                });
                if (!buyerRes.ok) {
                  console.error('[stripe-webhook] Buyer email failed:', await buyerRes.text());
                } else {
                  console.log('[stripe-webhook] Buyer email sent to', buyerEmail);
                }
              }

              // 2. CREATOR NOTIFICATION EMAIL
              // Look up creator's email via personal_profiles → auth.users
              const { data: creatorProfile } = await supabaseAdmin
                .from('personal_profiles')
                .select('user_id, username')
                .eq('id', product.creator_id)
                .single();

              if (creatorProfile) {
                const { data: creatorUser } = await supabaseAdmin.auth.admin.getUserById(creatorProfile.user_id);
                const creatorEmail = creatorUser?.user?.email;

                if (creatorEmail) {
                  const maskedBuyer = buyerEmail
                    ? buyerEmail.replace(/(.{2}).*(@.*)/, '$1***$2')
                    : 'a buyer';

                  const creatorHtml = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
                      <img src="${frontendUrl}/tapaway-logo-email.png" alt="TapAway" style="height: 32px; margin-bottom: 24px;" />
                      <h1 style="font-size: 22px; color: #111; margin: 0 0 8px;">You made a sale! 🎉</h1>
                      <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                        <strong>${maskedBuyer}</strong> just purchased your product:
                      </p>
                      <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0 0 4px; font-weight: 600; color: #111;">${product.title}</p>
                        <p style="margin: 0; color: #22c55e; font-weight: 700; font-size: 18px;">${priceFormatted}</p>
                      </div>
                      <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                        View Dashboard
                      </a>
                    </div>
                  `;

                  const creatorRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      from: emailFrom,
                      to: [creatorEmail],
                      subject: `You made a sale! 🎉 — ${product.title}`,
                      html: creatorHtml,
                    }),
                  });
                  if (!creatorRes.ok) {
                    console.error('[stripe-webhook] Creator email failed:', await creatorRes.text());
                  } else {
                    console.log('[stripe-webhook] Creator email sent to', creatorEmail);
                  }
                }
              }
            } catch (emailErr) {
              console.error('[stripe-webhook] Email sending error (non-blocking):', emailErr);
            }
          })();
        }
      }
    }

    // ============================================================
    // CARD ADDON / ONE-TIME CARD ORDER HANDLING
    // ============================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const cardType = session.metadata?.type;

      if (cardType === 'card_addon' || cardType === 'card_onetime') {
        console.log(`[stripe-webhook] Processing ${cardType} checkout`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
          mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        );

        const profileId = session.metadata?.profile_id;
        const userId = session.metadata?.user_id;

        if (profileId && userId) {
          // Set has_card_addon flag for subscription
          if (cardType === 'card_addon') {
            const subId = session.subscription as string;
            await supabaseAdmin
              .from('personal_profiles')
              .update({
                has_card_addon: true,
                ...(subId ? {} : {}),
              })
              .eq('id', profileId);
            console.log(`[stripe-webhook] Set has_card_addon=true for profile ${profileId}`);
          }

          // Create card request record with shipping from metadata
          const { error: insertErr } = await supabaseAdmin
            .from('personal_card_requests')
            .insert({
              profile_id: profileId,
              user_id: userId,
              quantity: 3,
              is_addon: cardType === 'card_addon',
              status: 'pending',
              stripe_session_id: session.id,
              shipping_name: session.metadata?.shipping_name || null,
              shipping_address_line1: session.metadata?.shipping_line1 || null,
              shipping_address_line2: session.metadata?.shipping_line2 || null,
              shipping_city: session.metadata?.shipping_city || null,
              shipping_state: session.metadata?.shipping_state || null,
              shipping_postal_code: session.metadata?.shipping_postal_code || null,
              shipping_country: session.metadata?.shipping_country || 'US',
            });

          if (insertErr) {
            console.error('[stripe-webhook] Failed to create card request:', insertErr);
          } else {
            console.log(`[stripe-webhook] Created card request for profile ${profileId}`);
          }

          // Internal notification
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
                  subject: `📦 ${cardType === 'card_addon' ? 'Card Club Signup' : 'One-Time Card Order'} — 3 cards`,
                  html: `<p><strong>${session.metadata?.shipping_name || 'Customer'}</strong> ordered 3 cards (${cardType}).</p>
                         <p>${session.metadata?.shipping_line1 || ''}${session.metadata?.shipping_line2 ? ', ' + session.metadata.shipping_line2 : ''}<br/>
                         ${session.metadata?.shipping_city || ''}, ${session.metadata?.shipping_state || ''} ${session.metadata?.shipping_postal_code || ''}</p>
                         <p>Profile: ${profileId}</p>`,
                }),
              });
            }
          } catch (_) { /* non-blocking */ }
        }
      }
    }

    // ============================================================
    // AFFILIATE PAID CONVERSION COMMISSION
    // When a subscription transitions from trialing → active, grant paid-tier commission
    // ============================================================
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      const previousAttributes = (event.data as any).previous_attributes;

      // Only fire when status changed TO active FROM trialing
      if (subscription.status === 'active' && previousAttributes?.status === 'trialing') {
        const customerId = subscription.customer as string;
        console.log(`[stripe-webhook] Subscription converted from trial to active for customer ${customerId}`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
          mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        );

        // Find the personal profile by stripe_customer_id
        const { data: profile } = await supabaseAdmin
          .from('personal_profiles')
          .select('id, referred_by, user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile?.referred_by) {
          try {
            // Look up affiliate by referral code
            const { data: affiliate } = await supabaseAdmin
              .from('affiliates')
              .select('id')
              .eq('referral_code', profile.referred_by.toLowerCase())
              .eq('is_active', true)
              .maybeSingle();

            if (affiliate) {
              // Find the referral record
              const { data: referral } = await supabaseAdmin
                .from('affiliate_referrals')
                .select('id')
                .eq('affiliate_id', affiliate.id)
                .eq('referred_user_id', profile.user_id)
                .maybeSingle();

              if (referral) {
                // Check if a paid commission already exists for this referral
                const { data: existingComm } = await supabaseAdmin
                  .from('affiliate_commissions')
                  .select('id')
                  .eq('referral_id', referral.id)
                  .eq('note', 'paid_conversion')
                  .maybeSingle();

                if (!existingComm) {
                  // Count total referrals for tiering
                  const { count: referralCount } = await supabaseAdmin
                    .from('affiliate_referrals')
                    .select('id', { count: 'exact', head: true })
                    .eq('affiliate_id', affiliate.id);

                  // Get tiered settings
                  const { data: affSettings } = await supabaseAdmin
                    .from('affiliate_settings')
                    .select('*')
                    .limit(1)
                    .single();

                  const threshold = affSettings?.bonus_threshold ?? 25;
                  const amount = (referralCount ?? 0) > threshold
                    ? Number(affSettings?.commission_paid_bonus ?? 8)
                    : Number(affSettings?.commission_paid_base ?? 5);

                  await supabaseAdmin
                    .from('affiliate_commissions')
                    .insert({
                      affiliate_id: affiliate.id,
                      referral_id: referral.id,
                      amount,
                      status: 'pending',
                      note: 'paid_conversion',
                    });

                  console.log(`[stripe-webhook] Created $${amount} paid-conversion commission for affiliate ${affiliate.id}`);
                } else {
                  console.log('[stripe-webhook] Paid conversion commission already exists, skipping');
                }
              }
            }
          } catch (affErr) {
            console.error('[stripe-webhook] Affiliate paid commission error (non-fatal):', affErr);
          }
        }
      }
    }

    // ============================================================
    // INVOICE.PAID — State-machine for rep commission lifecycle
    // ============================================================
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as any;
      const amountPaid = invoice.amount_paid || 0;
      const invoiceSubId = invoice.subscription as string | null;

      if (amountPaid > 0 && invoiceSubId) {
        console.log(`[stripe-webhook] invoice.paid: sub=${invoiceSubId}, amount=${amountPaid}`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
          mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        );

        // Find the upfront commission linked to this subscription
        const { data: existingComm } = await supabaseAdmin
          .from('commissions')
          .select('*')
          .eq('stripe_subscription_id', invoiceSubId)
          .eq('commission_type', 'upfront')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingComm) {
          if (existingComm.status === 'trial_pending') {
            // FIRST REAL PAYMENT — upgrade trial_pending
            const isAnnual = existingComm.billing_cycle === 'annual';
            const isRestaurant = existingComm.plan_tier === 'restaurant';

            // Get comp settings for point values and clawback days
            const { data: compSettings } = await supabaseAdmin
              .from('rep_compensation_settings')
              .select('*')
              .limit(1)
              .single();

            const pointsValue = isRestaurant
              ? Number(compSettings?.restaurant_point_value ?? 1)
              : Number(compSettings?.lite_point_value ?? 0.5);
            const clawbackDays = Number(compSettings?.clawback_days ?? 60);

            const updateData: Record<string, unknown> = {
              status: isAnnual ? 'available' : 'pending',
              points_value: pointsValue,
            };

            if (!isAnnual) {
              updateData.clawback_until = new Date(Date.now() + clawbackDays * 24 * 60 * 60 * 1000).toISOString();
            }

            const { error: updateErr } = await supabaseAdmin
              .from('commissions')
              .update(updateData)
              .eq('id', existingComm.id);

            if (updateErr) {
              console.error('[stripe-webhook] Failed to upgrade trial_pending commission:', updateErr);
            } else {
              console.log(`[stripe-webhook] Upgraded commission ${existingComm.id} to ${updateData.status} with ${pointsValue} pts`);
            }
          } else if (existingComm.status === 'available' || existingComm.status === 'pending') {
            // SUBSEQUENT PAYMENT — create recurring commission
            const { data: compSettings } = await supabaseAdmin
              .from('rep_compensation_settings')
              .select('*')
              .limit(1)
              .single();

            const isRestaurant = existingComm.plan_tier === 'restaurant';
            const isAnnual = existingComm.billing_cycle === 'annual';

            let recurringAmount = 4; // fallback
            if (compSettings) {
              if (isRestaurant) {
                recurringAmount = isAnnual
                  ? Number(compSettings.restaurant_annual_recurring)
                  : Number(compSettings.restaurant_monthly_recurring);
              } else {
                recurringAmount = isAnnual
                  ? Number(compSettings.lite_annual_recurring)
                  : Number(compSettings.lite_monthly_recurring);
              }
            }

            const now = new Date();
            const periodLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const { error: recurErr } = await supabaseAdmin
              .from('commissions')
              .insert({
                rep_id: existingComm.rep_id,
                rep_restaurant_id: existingComm.rep_restaurant_id,
                restaurant_id: existingComm.restaurant_id,
                type: 'recurring',
                commission_type: 'recurring',
                plan_tier: existingComm.plan_tier,
                billing_cycle: existingComm.billing_cycle,
                amount: recurringAmount,
                status: 'available',
                points_value: 0,
                period_label: periodLabel,
                stripe_subscription_id: invoiceSubId,
                note: `Recurring commission (${existingComm.plan_tier} ${existingComm.billing_cycle})`,
              });

            if (recurErr) {
              console.error('[stripe-webhook] Failed to create recurring commission:', recurErr);
            } else {
              console.log(`[stripe-webhook] Created $${recurringAmount} recurring commission for rep ${existingComm.rep_id}`);
            }
          }
        } else {
          console.log('[stripe-webhook] invoice.paid: no rep commission found for this subscription, skipping');
        }
      }
    }

    // ============================================================
    // PERSONAL SUBSCRIPTION CANCELLATION + REP COMMISSION CLAWBACK
    // ============================================================
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer as string;
      const deletedSubId = subscription.id as string;
      console.log(`[stripe-webhook] Subscription deleted for customer ${customerId}`);

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
        mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      );

      // === REP COMMISSION CLAWBACK/VOIDING ===
      if (deletedSubId) {
        // Void trial_pending commissions
        const { data: trialComms } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('stripe_subscription_id', deletedSubId)
          .eq('status', 'trial_pending');

        if (trialComms && trialComms.length > 0) {
          const ids = trialComms.map((c: any) => c.id);
          await supabaseAdmin
            .from('commissions')
            .update({ status: 'voided', note: 'Voided: customer cancelled during free trial' })
            .in('id', ids);
          console.log(`[stripe-webhook] Voided ${ids.length} trial_pending commissions for sub ${deletedSubId}`);
        }

        // Clawback pending (within clawback window) commissions
        const { data: pendingComms } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('stripe_subscription_id', deletedSubId)
          .eq('status', 'pending')
          .gt('clawback_until', new Date().toISOString());

        if (pendingComms && pendingComms.length > 0) {
          const ids = pendingComms.map((c: any) => c.id);
          await supabaseAdmin
            .from('commissions')
            .update({ status: 'clawed_back', note: 'Clawed back: customer cancelled within 60-day window' })
            .in('id', ids);
          console.log(`[stripe-webhook] Clawed back ${ids.length} pending commissions for sub ${deletedSubId}`);
        }
      }

      // === CARD CLUB ADDON CANCELLATION ===
      // Check if the deleted subscription was the Card Club addon
      try {
        const deletedSub = event.data.object as any;
        const priceId = deletedSub.items?.data?.[0]?.price?.id;
        if (priceId === 'price_1TMM0LDg8DaTuVNZUgZ4GtWJ') {
          // Find profile by stripe_customer_id and revoke card addon
          const { error: addonErr } = await supabaseAdmin
            .from('personal_profiles')
            .update({ has_card_addon: false })
            .eq('stripe_customer_id', customerId);
          if (!addonErr) {
            console.log(`[stripe-webhook] Card Club addon revoked for customer ${customerId}`);
          }
        }
      } catch (_) { /* non-blocking */ }

      // === EXISTING PERSONAL PROFILE DOWNGRADE ===
      // Find personal profile by stripe_customer_id
      const { data: profile } = await supabaseAdmin
        .from('personal_profiles')
        .select('id, header_type, header_image_url')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (profile) {
        console.log(`[stripe-webhook] Downgrading personal profile ${profile.id}`);

        // Archive premium blocks
        await supabaseAdmin
          .from('personal_blocks')
          .update({ is_archived: true })
          .eq('profile_id', profile.id)
          .in('block_type', ['photo_collage', 'email_capture']);

        // Archive links beyond first 5
        const { data: links } = await supabaseAdmin
          .from('personal_links')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('is_archived', false)
          .order('sort_order', { ascending: true });

        if (links && links.length > 5) {
          const linksToArchive = links.slice(5).map((l: any) => l.id);
          await supabaseAdmin
            .from('personal_links')
            .update({ is_archived: true })
            .in('id', linksToArchive);
          console.log(`[stripe-webhook] Archived ${linksToArchive.length} links`);
        }

        // Build profile update
        const updateData: Record<string, unknown> = {
          plan_type: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          archived_at: new Date().toISOString(),
        };

        // Archive custom header if exists
        if (profile.header_type === 'image' && profile.header_image_url) {
          updateData.archived_header_type = profile.header_type;
          updateData.archived_header_image_url = profile.header_image_url;
          updateData.header_type = 'color';
          updateData.header_image_url = null;
        }

        await supabaseAdmin
          .from('personal_profiles')
          .update(updateData)
          .eq('id', profile.id);

        console.log(`[stripe-webhook] Personal profile ${profile.id} downgraded to free`);
      } else {
        // Also check restaurants table for business subscriptions
        const { data: restaurant } = await supabaseAdmin
          .from('restaurants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (restaurant) {
          await supabaseAdmin
            .from('restaurants')
            .update({ subscription_status: 'canceled' })
            .eq('id', restaurant.id);
          console.log(`[stripe-webhook] Restaurant ${restaurant.id} subscription marked canceled`);
        } else {
          console.log(`[stripe-webhook] No profile or restaurant found for customer ${customerId}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[stripe-webhook] Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});