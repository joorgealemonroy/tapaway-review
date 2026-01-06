import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-personal-checkout] Verifying session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', status: session.payment_status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = session.metadata || {};
    const customerEmail = session.customer_email || (session.customer as Stripe.Customer)?.email;
    
    if (!customerEmail) {
      throw new Error('No customer email found');
    }

    console.log('[verify-personal-checkout] Session verified, metadata:', {
      type: metadata.type,
      username: metadata.username,
      fullName: metadata.full_name,
    });

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === customerEmail);

    let userId: string;
    let tempPassword: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      console.log('[verify-personal-checkout] Found existing user:', userId);
    } else {
      // Create a new user
      tempPassword = crypto.randomUUID().slice(0, 16);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: metadata.full_name,
          account_type: 'personal',
        },
      });

      if (createError || !newUser.user) {
        throw new Error(`Failed to create user: ${createError?.message}`);
      }

      userId = newUser.user.id;
      console.log('[verify-personal-checkout] Created new user:', userId);
    }

    // Create the personal profile
    const username = metadata.username || customerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    const { data: existingProfile } = await supabase
      .from('personal_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    let profileId: string;
    let isNewProfile = false;

    if (existingProfile) {
      // Update existing profile
      await supabase
        .from('personal_profiles')
        .update({
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
          subscription_status: 'active',
          plan_type: metadata.plan_type || 'monthly',
        })
        .eq('id', existingProfile.id);
        
      profileId = existingProfile.id;
      console.log('[verify-personal-checkout] Updated existing profile');
    } else {
      // Create new profile
      const { data: profile, error: profileError } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: userId,
          username,
          full_name: metadata.full_name || 'TapAway User',
          email: customerEmail,
          headline: metadata.card_headline || null,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
          subscription_status: 'active',
          plan_type: metadata.plan_type || 'monthly',
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      profileId = profile.id;
      isNewProfile = true;
      console.log('[verify-personal-checkout] Created profile:', profile.id);

      // Create links if provided
      if (metadata.links_json) {
        try {
          const links = JSON.parse(metadata.links_json);
          if (Array.isArray(links) && links.length > 0) {
            const linksToInsert = links.map((link: any, index: number) => ({
              profile_id: profile.id,
              link_type: link.type,
              label: link.label,
              url: link.url,
              sort_order: index,
            }));

            await supabase
              .from('personal_links')
              .insert(linksToInsert);
              
            console.log('[verify-personal-checkout] Created links:', linksToInsert.length);
          }
        } catch (e) {
          console.error('[verify-personal-checkout] Failed to parse links:', e);
        }
      }
    }

    // Send welcome emails for NEW profiles only
    if (isNewProfile) {
      try {
        // Fetch the full profile to get any additional data
        const { data: fullProfile } = await supabase
          .from('personal_profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        const emailPayload = {
          fullName: metadata.full_name || fullProfile?.full_name || 'TapAway User',
          username,
          email: customerEmail,
          profilePhotoUrl: fullProfile?.profile_photo_url || undefined,
          headerImageUrl: fullProfile?.header_image_url || undefined,
          accentColor: fullProfile?.header_color || undefined,
          profileId,
          cardHeadline: metadata.card_headline || fullProfile?.headline || undefined,
        };

        console.log('[verify-personal-checkout] Sending welcome emails...');

        // Call the welcome emails function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-personal-welcome-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();
        console.log('[verify-personal-checkout] Email result:', emailResult);
      } catch (emailError) {
        // Don't fail the whole flow if emails fail
        console.error('[verify-personal-checkout] Failed to send welcome emails:', emailError);
      }
    }

    // Return success with session info for auto-login
    return new Response(
      JSON.stringify({
        success: true,
        email: customerEmail,
        username,
        needsPasswordSetup: tempPassword !== null,
        // Don't send tempPassword to client - use magic link instead
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-personal-checkout] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
