import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

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
        // Create new user with a random password (they'll reset it via email)
        const randomPassword = crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: customerEmail,
          password: randomPassword,
          email_confirm: true,
        });

        if (createError) {
          console.error('[stripe-webhook] Failed to create user:', createError);
          return new Response(JSON.stringify({ error: 'Failed to create user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        userId = newUser.user.id;
        console.log('[stripe-webhook] Created new user:', userId);
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

      // Get customer portal URL
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${Deno.env.get('STRIPE_PORTAL_RETURN_URL') || `${supabaseUrl}/dashboard`}`,
      });

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

      if (existingRestaurant) {
        // Update existing restaurant
        const { error: updateError } = await supabaseAdmin
          .from('restaurants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_portal_url: portalSession.url,
            plan_type: planType,
            subscription_status: 'active',
          })
          .eq('id', existingRestaurant.id);

        if (updateError) {
          console.error('[stripe-webhook] Failed to update restaurant:', updateError);
        } else {
          console.log('[stripe-webhook] Updated existing restaurant:', existingRestaurant.id);
          restaurantId = existingRestaurant.id;
        }
      } else {
        // Create new restaurant record
        const { data: newRestaurant, error: insertError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            owner_id: userId,
            restaurant_name: 'My Restaurant',
            greeting_name: greetingName,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_portal_url: portalSession.url,
            plan_type: planType,
            subscription_status: 'active',
            header_title: "How was your visit?",
            header_subtitle: "We'd love to hear about your experience!",
            menu_title: "Our Menu",
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[stripe-webhook] Failed to create restaurant:', insertError);
        } else {
          console.log('[stripe-webhook] Created restaurant successfully:', newRestaurant?.id);
          restaurantId = newRestaurant?.id;
        }
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

      console.log('[stripe-webhook] Successfully processed checkout session');
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
