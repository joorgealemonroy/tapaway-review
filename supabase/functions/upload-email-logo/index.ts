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

    // Fetch the logo from the public URL
    const logoUrl = 'https://id.lovableproject.com/storage/v1/object/public/assets/xfrvckdcrqvkqdwjzopt/tapaway-logo-email.png';
    
    // Try fetching from lovable first, fallback to hardcoded base64
    let imageBuffer: ArrayBuffer;
    
    try {
      const imgResponse = await fetch(logoUrl);
      if (imgResponse.ok) {
        imageBuffer = await imgResponse.arrayBuffer();
      } else {
        throw new Error('Failed to fetch');
      }
    } catch {
      // Hardcoded logo won't work, return error
      return new Response(JSON.stringify({ 
        error: 'Please upload the logo manually to Supabase Storage',
        bucket: 'restaurant-logos',
        filename: 'tapaway-email-logo.png'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('restaurant-logos')
      .upload('tapaway-email-logo.png', imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/restaurant-logos/tapaway-email-logo.png`;

    return new Response(JSON.stringify({ 
      success: true, 
      path: data.path,
      publicUrl 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
