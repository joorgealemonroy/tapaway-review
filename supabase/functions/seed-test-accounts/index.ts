import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_ACCOUNTS = [
  {
    email: "test-owner1@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 1",
    restaurantName: "Test Restaurant 1 (TEST)",
    slug: "test-restaurant-1"
  },
  {
    email: "test-owner2@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 2",
    restaurantName: "Test Restaurant 2 (TEST)",
    slug: "test-restaurant-2"
  },
  {
    email: "test-owner3@tapaway.co",
    password: "TapawayTest123!",
    name: "Test Owner 3",
    restaurantName: "Test Restaurant 3 (TEST)",
    slug: "test-restaurant-3"
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if request is authenticated and user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin by email
    const ADMIN_EMAILS = ["tap@tapaway.co"];
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const createdAccounts = [];

    for (const account of TEST_ACCOUNTS) {
      try {
        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            name: account.name
          }
        });

        if (authError && !authError.message.includes('already registered')) {
          console.error(`Failed to create user ${account.email}:`, authError);
          continue;
        }

        const userId = authUser?.user?.id;
        if (!userId) {
          console.error(`No user ID for ${account.email}`);
          continue;
        }

        // Check if restaurant already exists
        const { data: existingRestaurant } = await supabaseAdmin
          .from('restaurants')
          .select('id')
          .eq('owner_id', userId)
          .single();

        if (existingRestaurant) {
          console.log(`Restaurant already exists for ${account.email}`);
          createdAccounts.push({ email: account.email, status: 'already_exists' });
          continue;
        }

        // Create restaurant record
        const { error: restaurantError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            owner_id: userId,
            restaurant_name: account.restaurantName,
            custom_slug: account.slug,
            owner_name: account.name,
            subscription_status: 'active',
            plan_type: 'test',
            is_demo_account: true, // Using existing column for test flag
            greeting_name: account.name,
            total_taps: 2500, // Enough to unlock AI Coach
            header_title: 'How was your visit?',
            header_subtitle: 'We would love to hear about your experience!',
            menu_title: 'Our Menu'
          });

        if (restaurantError) {
          console.error(`Failed to create restaurant for ${account.email}:`, restaurantError);
          continue;
        }

        createdAccounts.push({
          email: account.email,
          name: account.name,
          restaurantName: account.restaurantName,
          slug: account.slug,
          status: 'created'
        });

        console.log(`Successfully created test account: ${account.email}`);
      } catch (error) {
        console.error(`Error creating account ${account.email}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${createdAccounts.length} test accounts`,
        accounts: createdAccounts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in seed-test-accounts:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
