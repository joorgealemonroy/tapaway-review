import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the caller is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin status via email or role
    const isAdmin = user.email === 'tap@tapaway.co' || 
      user.app_metadata?.role === 'admin';
    
    // Also check user_roles table
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!isAdmin && !roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.email} triggered weekly report generation`);

    // Get all active restaurants
    const { data: restaurants } = await supabaseClient
      .from('restaurants')
      .select('*, owner_id')
      .eq('subscription_status', 'active');

    if (!restaurants) {
      return new Response(JSON.stringify({ message: 'No restaurants found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    for (const restaurant of restaurants) {
      try {
        // Get owner email
        const { data: owner } = await supabaseClient.auth.admin.getUserById(restaurant.owner_id);
        const email = owner?.user?.email;

        if (!email) continue;

        // Fetch insights for this restaurant
        const insightsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-coach-insights`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ restaurantId: restaurant.id })
        });

        const insightsData = await insightsResponse.json();

        // Fetch goals
        const { data: goals } = await supabaseClient
          .from('goals')
          .select('*')
          .eq('restaurant_id', restaurant.id);

        // Fetch competitors
        const { data: competitors } = await supabaseClient
          .from('competitors')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .limit(1);

        // Generate email content
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .score-card { display: inline-block; margin: 10px; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center; }
    .score { font-size: 32px; font-weight: bold; color: #0ea5e9; }
    .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #0ea5e9; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Weekly TapAway Report</h1>
    <p>${restaurant.restaurant_name}</p>
  </div>
  <div class="content">
    <h2>Your Performance Scores</h2>
    <div class="score-card">
      <div class="score">${insightsData.scores.health}</div>
      <div>Health Score</div>
    </div>
    <div class="score-card">
      <div class="score">${insightsData.scores.staffEngagement}</div>
      <div>Staff Engagement</div>
    </div>
    <div class="score-card">
      <div class="score">${insightsData.scores.reviewQuality}</div>
      <div>Review Quality</div>
    </div>
    <div class="score-card">
      <div class="score">${insightsData.scores.activity}</div>
      <div>Activity</div>
    </div>

    ${competitors && competitors.length > 0 ? `
    <div class="section">
      <h3>Competitor Insight</h3>
      <p>Your top competitor (${competitors[0].competitor_name}) has ${competitors[0].current_review_count} reviews.</p>
    </div>
    ` : ''}

    ${goals && goals.length > 0 ? `
    <div class="section">
      <h3>Goal Progress</h3>
      ${goals.slice(0, 3).map(g => `
        <p><strong>${g.title}</strong>: ${g.status.replace('_', ' ')}</p>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h3>Top Actions for This Week</h3>
      ${insightsData.insights.find((i: any) => i.title.includes('Recommended'))?.content || 'Keep up the great work!'}
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${Deno.env.get('SUPABASE_URL')}/dashboard" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Full Dashboard
      </a>
    </p>
  </div>
</body>
</html>`;

        console.log(`Would send email to ${email} for restaurant ${restaurant.restaurant_name}`);
        // In production, integrate with Resend or your email provider here
        
      } catch (error) {
        console.error(`Error processing restaurant ${restaurant.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${restaurants.length} restaurants` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});