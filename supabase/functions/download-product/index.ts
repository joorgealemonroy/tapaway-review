import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const accessToken = url.searchParams.get('token');

    if (!accessToken) {
      return new Response('Missing access token', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
      mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    );

    // Look up the purchase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('creator_purchases')
      .select('*, product:creator_products!product_id(file_url, title)')
      .eq('access_token', accessToken)
      .single();

    if (purchaseError || !purchase) {
      return new Response('Invalid or expired download link', { status: 404, headers: corsHeaders });
    }

    // Check expiry
    if (new Date(purchase.access_expires_at) < new Date()) {
      return new Response('This download link has expired', { status: 410, headers: corsHeaders });
    }

    const product = purchase.product as any;
    if (!product?.file_url) {
      return new Response('File not found', { status: 404, headers: corsHeaders });
    }

    // Create a signed URL for the private file (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('creator-files')
      .createSignedUrl(product.file_url, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[download-product] Signed URL error:', signedUrlError);
      return new Response('Failed to generate download link', { status: 500, headers: corsHeaders });
    }

    // Redirect to the signed URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': signedUrlData.signedUrl,
      },
    });
  } catch (error) {
    console.error('[download-product] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
