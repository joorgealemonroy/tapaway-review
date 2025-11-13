import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the user from the request (using anon key auth)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[assign-test-owner] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('[assign-test-owner] User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this is the test account
    if (user.email !== 'test@me.com') {
      console.error('[assign-test-owner] Not test account:', user.email);
      return new Response(
        JSON.stringify({ error: 'This function is only for test accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-test-owner] Assigning test restaurant to user:', user.id);

    // Update the test restaurant's owner_id using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({ owner_id: user.id })
      .eq('id', TEST_RESTAURANT_ID)
      .select()
      .single();

    if (error) {
      console.error('[assign-test-owner] Database update failed:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to assign test restaurant', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-test-owner] Successfully assigned test restaurant');

    return new Response(
      JSON.stringify({ success: true, restaurant: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[assign-test-owner] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
