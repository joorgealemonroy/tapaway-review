import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing imageUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[upload-email-logo] Fetching image from:', imageUrl);
    
    // Fetch the image
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${imgResponse.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageBuffer = await imgResponse.arrayBuffer();
    console.log('[upload-email-logo] Image size:', imageBuffer.byteLength);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('restaurant-logos')
      .upload('tapaway-email-logo.png', imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('[upload-email-logo] Upload error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/restaurant-logos/tapaway-email-logo.png`;
    console.log('[upload-email-logo] Uploaded to:', publicUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      path: data.path,
      publicUrl 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[upload-email-logo] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
