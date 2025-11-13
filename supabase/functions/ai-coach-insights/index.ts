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
    const { restaurantId, locationId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch analytics data
    let analyticsQuery = supabaseClient
      .from('analytics_events')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (locationId) {
      analyticsQuery = analyticsQuery.eq('location_id', locationId);
    }

    const { data: analytics } = await analyticsQuery;
    const events = analytics || [];

    // Calculate last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentEvents = events.filter(e => new Date(e.created_at) >= last7Days);

    // Calculate scores
    const totalEvents = events.length;
    const recentEventsCount = recentEvents.length;
    
    const healthScore = Math.min(100, Math.round((recentEventsCount / 50) * 100));
    const activityScore = Math.min(100, Math.round((totalEvents / 100) * 100));
    
    const googleClicks = events.filter(e => e.event_type === 'google_review_clicked').length;
    const totalClicks = events.filter(e => e.event_type.includes('clicked')).length;
    const staffEngagement = totalClicks > 0 ? Math.round((googleClicks / totalClicks) * 100) : 50;
    
    const reviewQuality = Math.min(100, Math.round((googleClicks / 10) * 100));

    // Generate AI insights using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const prompt = `As an AI restaurant consultant, analyze this data and provide actionable insights:

Restaurant Analytics (Last 7 days):
- Total interactions: ${recentEventsCount}
- Google review clicks: ${events.filter(e => e.event_type === 'google_review_clicked' && new Date(e.created_at) >= last7Days).length}
- Yelp clicks: ${events.filter(e => e.event_type === 'yelp_clicked' && new Date(e.created_at) >= last7Days).length}
- Instagram clicks: ${events.filter(e => e.event_type === 'instagram_clicked' && new Date(e.created_at) >= last7Days).length}
- Menu views: ${events.filter(e => e.event_type === 'menu_viewed' && new Date(e.created_at) >= last7Days).length}

Provide insights in this exact format (use these exact section titles):

This Week's Performance Summary:
[2-3 sentences about overall performance]

Customer Sentiment Breakdown:
[Analysis of customer engagement patterns]

What Customers Loved:
[Positive highlights]

Potential Issues to Address:
[Areas for improvement]

Recommended Staff Actions:
[3-5 specific action items]

Menu Optimization Suggestions:
[Menu-related recommendations]

Projected Impact for Next Week:
[Forward-looking predictions]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert restaurant consultant providing clear, actionable insights.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const aiText = aiData.choices[0].message.content;

    // Parse AI response into structured insights
    const sections = [
      "This Week's Performance Summary",
      "Customer Sentiment Breakdown",
      "What Customers Loved",
      "Potential Issues to Address",
      "Recommended Staff Actions",
      "Menu Optimization Suggestions",
      "Projected Impact for Next Week"
    ];

    const insights = sections.map(title => {
      const regex = new RegExp(`${title}:[\\s\\S]*?(?=\\n\\n|$)`, 'i');
      const match = aiText.match(regex);
      const content = match ? match[0].replace(`${title}:`, '').trim() : 'Analyzing...';
      
      return {
        title,
        content,
        type: title.includes('Issues') ? 'warning' : title.includes('Loved') ? 'success' : 'info'
      };
    });

    return new Response(
      JSON.stringify({
        scores: {
          health: healthScore,
          staffEngagement,
          reviewQuality,
          activity: activityScore
        },
        insights
      }),
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