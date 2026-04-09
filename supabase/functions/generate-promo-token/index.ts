import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate caller is admin via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');

    // Verify the JWT and get the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin status via service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const isAdminEmail = user.email === 'tap@tapaway.co';
    let isAdminRole = false;
    if (!isAdminEmail) {
      const { data: roleRow } = await adminClient
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      isAdminRole = !!roleRow;
    }

    if (!isAdminEmail && !isAdminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const discountType = body.discount_type;

    if (discountType !== 'free' && discountType !== '50_off') {
      return new Response(JSON.stringify({ error: 'Invalid discount_type. Must be "free" or "50_off".' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create token with 30-minute expiry
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: tokenRow, error: insertError } = await adminClient
      .from('promo_tokens')
      .insert({
        discount_type: discountType,
        expires_at: expiresAt,
        created_by_user_id: user.id,
      })
      .select('token, expires_at')
      .single();

    if (insertError) {
      console.error('[generate-promo-token] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://tapaway.co';
    const onboardingUrl = `${frontendUrl}/onboarding?promo_token=${tokenRow.token}`;

    console.log('[generate-promo-token] Created token:', {
      discount_type: discountType,
      expires_at: tokenRow.expires_at,
      admin: user.email?.substring(0, 3) + '***',
    });

    return new Response(JSON.stringify({
      url: onboardingUrl,
      token: tokenRow.token,
      expires_at: tokenRow.expires_at,
      discount_type: discountType,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-promo-token] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
