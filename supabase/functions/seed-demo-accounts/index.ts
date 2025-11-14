import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create 5 demo accounts
    const demoAccounts = [
      {
        email: 'demo1@tapaway.co',
        password: 'DemoTest!12345',
        restaurant: {
          restaurant_name: 'Las Islas Marías - Demo',
          custom_slug: 'lasislasmariasdemo',
          is_demo_account: true,
          address: '123 Main St, Salem, OR 97301',
          phone: '(503) 555-0100',
          email: 'info@lasislasmariasdemo.com',
          google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJexample123',
          google_place_id: 'ChIJexample123',
          directions_url: 'https://maps.apple.com/?q=Las+Islas+Marias&address=123+Main+St+Salem+OR',
          instagram_url: 'https://instagram.com/lasislasmariasdemo',
          subscription_status: 'active',
          plan_type: 'monthly'
        },
        menu: [
          {
            name: 'Appetizers',
            sort_order: 0,
            items: [
              { name: 'Guacamole', description: 'Fresh avocado, lime, cilantro', price: '$8.99', sort_order: 0 },
              { name: 'Queso Fundido', description: 'Melted cheese with chorizo', price: '$10.99', sort_order: 1 },
              { name: 'Nachos Supreme', description: 'Tortilla chips loaded with toppings', price: '$12.99', sort_order: 2 }
            ]
          },
          {
            name: 'Entrees',
            sort_order: 1,
            items: [
              { name: 'Carne Asada', description: 'Grilled steak with rice and beans', price: '$18.99', sort_order: 0 },
              { name: 'Enchiladas', description: 'Three enchiladas with your choice of filling', price: '$14.99', sort_order: 1 },
              { name: 'Fish Tacos', description: 'Grilled fish with cabbage and lime crema', price: '$16.99', sort_order: 2 }
            ]
          }
        ]
      },
      {
        email: 'demo2@tapaway.co',
        password: 'DemoTest!54321',
        restaurant: {
          restaurant_name: 'Sakura Sushi House - Demo',
          custom_slug: 'sakurasushidemo',
          is_demo_account: true,
          address: '456 Oak Ave, Portland, OR 97202',
          phone: '(503) 555-0200',
          email: 'info@sakurasushidemo.com',
          google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJexample456',
          google_place_id: 'ChIJexample456',
          directions_url: 'https://maps.apple.com/?q=Sakura+Sushi+House&address=456+Oak+Ave+Portland+OR',
          yelp_review_url: 'https://www.yelp.com/biz/sakura-sushi-demo',
          subscription_status: 'active',
          plan_type: 'yearly'
        },
        menu: [
          {
            name: 'Rolls',
            sort_order: 0,
            items: [
              { name: 'California Roll', description: 'Crab, avocado, cucumber', price: '$12.99', sort_order: 0 },
              { name: 'Spicy Tuna Roll', description: 'Tuna, sriracha, cucumber', price: '$14.99', sort_order: 1 },
              { name: 'Dragon Roll', description: 'Eel, cucumber, avocado on top', price: '$16.99', sort_order: 2 }
            ]
          },
          {
            name: 'Sashimi',
            sort_order: 1,
            items: [
              { name: 'Tuna Sashimi', description: '5 pieces of fresh tuna', price: '$18.99', sort_order: 0 },
              { name: 'Salmon Sashimi', description: '5 pieces of fresh salmon', price: '$17.99', sort_order: 1 }
            ]
          }
        ]
      },
      {
        email: 'onboardtest@tapaway.co',
        password: 'Onboard!Test123',
        restaurant: {
          restaurant_name: 'Demo Bistro - Basic Setup',
          custom_slug: 'demobistrobasic',
          is_demo_account: true,
          address: '789 Pine St, Eugene, OR 97401',
          phone: '(541) 555-0300',
          email: 'contact@demobistrobasic.com',
          subscription_status: 'active',
          plan_type: 'monthly'
        },
        menu: []
      },
      {
        email: 'nomenutest@tapaway.co',
        password: 'MenuLess!12345',
        restaurant: {
          restaurant_name: 'Demo Cafe - No Menu',
          custom_slug: 'democafenomenu',
          is_demo_account: true,
          address: '321 Elm St, Bend, OR 97701',
          phone: '(541) 555-0400',
          email: 'hello@democafenomenu.com',
          google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJexample321',
          google_place_id: 'ChIJexample321',
          directions_url: 'https://maps.apple.com/?q=Demo+Cafe&address=321+Elm+St+Bend+OR',
          subscription_status: 'active',
          plan_type: 'monthly'
        },
        menu: []
      },
      {
        email: 'nolinkstest@tapaway.co',
        password: 'NoLinks!98765',
        restaurant: {
          restaurant_name: 'Demo Restaurant - No Links',
          custom_slug: 'demorestaurantnolinks',
          is_demo_account: true,
          address: '555 Cedar Rd, Ashland, OR 97520',
          phone: '(541) 555-0500',
          email: 'info@demorestaurantnolinks.com',
          subscription_status: 'active',
          plan_type: 'monthly'
        },
        menu: [
          {
            name: 'Specials',
            sort_order: 0,
            items: [
              { name: 'Chef Special', description: 'Daily special creation', price: '$24.99', sort_order: 0 }
            ]
          }
        ]
      }
    ];

    const createdAccounts = [];

    for (const account of demoAccounts) {
      // Create user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true
      });

      if (authError) {
        console.error(`Failed to create user ${account.email}:`, authError);
        continue;
      }

      const userId = authData.user.id;

      // Create restaurant
      const { data: restaurant, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .insert({
          ...account.restaurant,
          owner_id: userId,
          slug_locked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (restaurantError) {
        console.error(`Failed to create restaurant for ${account.email}:`, restaurantError);
        continue;
      }

      // Create menu if provided
      if (account.menu && account.menu.length > 0) {
        for (const section of account.menu) {
          const { data: menuSection, error: sectionError } = await supabaseAdmin
            .from('menu_sections')
            .insert({
              restaurant_id: restaurant.id,
              name: section.name,
              sort_order: section.sort_order
            })
            .select()
            .single();

          if (sectionError) {
            console.error(`Failed to create menu section:`, sectionError);
            continue;
          }

          // Create menu items
          const items = section.items.map(item => ({
            section_id: menuSection.id,
            ...item
          }));

          await supabaseAdmin.from('menu_items').insert(items);
        }
      }

      // Create some fake analytics events
      const events = [];
      const now = new Date();
      for (let i = 0; i < 20; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() - daysAgo);
        
        events.push({
          restaurant_id: restaurant.id,
          event_type: ['tap', 'google_click', 'menu_view', 'directions_click'][Math.floor(Math.random() * 4)],
          created_at: eventDate.toISOString(),
          event_data: {}
        });
      }

      await supabaseAdmin.from('analytics_events').insert(events);

      createdAccounts.push({
        email: account.email,
        password: account.password,
        restaurant_name: account.restaurant.restaurant_name,
        slug: account.restaurant.custom_slug
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        created: createdAccounts.length,
        accounts: createdAccounts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
