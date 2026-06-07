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
    const body = await req.json();
    const { token, markUsed } = body;

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ valid: false, error: 'Missing token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid token format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: stricter for markUsed (mutation), looser for read-only validation
    const rlKey = getRateLimitKey(req, markUsed ? 'validate-promo-token:mark' : 'validate-promo-token:read');
    const rlLimit = markUsed ? 5 : 20;
    if (!checkRateLimit(rlKey, rlLimit, 60 * 1000)) {
      return rateLimitResponse(corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // If markUsed, require authenticated caller; derive user id from JWT (never from body)
    let authedUserId: string | null = null;
    if (markUsed) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ valid: false, error: 'Authentication required to consume token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ valid: false, error: 'Invalid session' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      authedUserId = user.id;
    }

    const { data: tokenRow, error: fetchError } = await adminClient
      .from('promo_tokens')
      .select('id, discount_type, expires_at, is_used')
      .eq('token', token)
      .maybeSingle();

    if (fetchError || !tokenRow) {
      return new Response(JSON.stringify({ valid: false, error: 'Token not found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tokenRow.is_used) {
      return new Response(JSON.stringify({ valid: false, error: 'Token already used' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Token expired' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optionally mark as used (only with verified JWT; user id is from the JWT, not the body)
    if (markUsed && authedUserId) {
      const { error: updateError } = await adminClient
        .from('promo_tokens')
        .update({ is_used: true, used_by_user_id: authedUserId })
        .eq('id', tokenRow.id);

      if (updateError) {
        console.error('[validate-promo-token] Failed to mark used:', updateError);
      } else {
        console.log('[validate-promo-token] Token marked as used:', tokenRow.id);
      }
    }

    return new Response(JSON.stringify({
      valid: true,
      discount_type: tokenRow.discount_type,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[validate-promo-token] Error:', error);
    return new Response(JSON.stringify({ valid: false, error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
