// Award commissions when an admin approves a rep-created demo hub.
// - Inserts one $5 demo_bonus row per approved personal_profile (idempotent).
// - The daily $50 shift_base row is awarded by the trg_award_daily_base DB trigger.
// - Applies a "Quality Gate": bonuses beyond the probation cap are locked
//   until the rep proves a >= 5% conversion rate over the trailing 30 days.
// - Recomputes the current month's Closer's Pool tier.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { personal_profile_id } = await req.json();
    if (!personal_profile_id || typeof personal_profile_id !== 'string') {
      return json({ error: 'personal_profile_id required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is an admin.
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return json({ error: 'unauthorized' }, 401);
    const { data: isAdminRes } = await userClient.rpc('is_admin');
    if (!isAdminRes) return json({ error: 'forbidden' }, 403);

    // All cap / quality-gate / daily-base logic lives in one atomic,
    // idempotent database function keyed to the California workday the demo
    // was SUBMITTED (personal_profiles.created_at), never the approval day.
    const { data: result, error: rpcErr } = await admin.rpc('award_demo_commission', {
      _personal_profile_id: personal_profile_id,
    });
    if (rpcErr) {
      console.error('award_demo_commission failed', rpcErr);
      return json({ error: rpcErr.message }, 500);
    }

    const payload = (result ?? {}) as Record<string, unknown>;
    const repId = payload.rep_id as string | undefined;
    const earnedOn = payload.earned_on as string | undefined;

    // --- Refresh monthly Closer's Pool tier for the earned period ---
    if (repId) {
      const periodLabel = new Date(`${earnedOn ?? new Date().toISOString().slice(0, 10)}T12:00:00Z`)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      await admin.rpc('recompute_closer_pool', {
        _rep_id: repId,
        _period_label: periodLabel,
      });
    }

    return json({ ok: true, ...payload });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
