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
      console.error('No stripe-signature header found');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Received event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout session:', {
        customer: session.customer,
        customer_email: session.customer_email,
        subscription: session.subscription,
      });

      const customerEmail = session.customer_email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      if (!customerEmail) {
        console.error('No customer email in session');
        return new Response(JSON.stringify({ error: 'No customer email' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
      let userId = existingUser?.users.find(u => u.email === customerEmail)?.id;

      if (!userId) {
        // Create new user with a random password (they'll reset it via email)
        const randomPassword = crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: customerEmail,
          password: randomPassword,
          email_confirm: true,
        });

        if (createError) {
          console.error('Failed to create user:', createError);
          return new Response(JSON.stringify({ error: 'Failed to create user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        userId = newUser.user.id;
        console.log('Created new user:', userId);
      }

      // Determine plan type and number of locations
      let planType = 'monthly';
      let numLocations = 1;

      // Get the price ID from the session to determine plan
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        
        // Map price IDs to plan types
        // You'll need to update these with your actual Stripe price IDs
        if (priceId?.includes('year')) {
          planType = 'yearly';
          numLocations = 1;
        } else if (priceId?.includes('bundle')) {
          planType = 'bundle';
          numLocations = 3;
        } else {
          planType = 'monthly';
          numLocations = 1;
        }
      }

      console.log(`Creating ${numLocations} location(s) for plan: ${planType}`);

      // Get customer portal URL
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${Deno.env.get('VITE_SUPABASE_URL') || supabaseUrl}/dashboard`,
      });

      // Create restaurant locations
      for (let i = 0; i < numLocations; i++) {
        const locationName = numLocations > 1 
          ? `Location ${i + 1}` 
          : 'My Restaurant';

        const { error: insertError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            owner_id: userId,
            restaurant_name: locationName,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_portal_url: portalSession.url,
            plan_type: planType,
            subscription_status: 'active',
            header_subtitle: "We'd love to hear about your experience!",
            menu_title: "Our Menu",
          });

        if (insertError) {
          console.error(`Failed to create location ${i + 1}:`, insertError);
        } else {
          console.log(`Created location ${i + 1}: ${locationName}`);
        }
      }

      console.log('Successfully processed checkout session');
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
