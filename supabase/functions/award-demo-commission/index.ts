// Award commissions when an admin approves a rep-created demo hub.
// - Inserts one $5 demo_bonus row per approved personal_profile (idempotent).
// - When the rep hits their daily quota, inserts one daily shift_base row.
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

    // Load profile + comp settings.
    const { data: profile } = await admin
      .from('personal_profiles')
      .select('id, sales_rep_id, is_approved, full_name')
      .eq('id', personal_profile_id)
      .maybeSingle();
    if (!profile) return json({ error: 'profile not found' }, 404);
    if (!profile.sales_rep_id) return json({ ok: true, skipped: 'no rep' });
    if (!profile.is_approved) return json({ ok: true, skipped: 'not approved yet' });

    const { data: settings } = await admin
      .from('rep_compensation_settings')
      .select('*')
      .limit(1)
      .single();

    const repId: string = profile.sales_rep_id;
    const now = new Date();
    const periodLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // --- Quality gate: is rep in probation or below 5% conversion rate? ---
    const probationDays = Number(settings?.quality_gate_probation_days ?? 30);
    const minRate = Number(settings?.quality_gate_min_rate ?? 0.05);
    const capDemos = Number(settings?.quality_gate_cap_demos ?? 20);

    const { data: repRow } = await admin
      .from('sales_reps')
      .select('created_at')
      .eq('id', repId)
      .maybeSingle();
    const repAgeDays = repRow?.created_at
      ? (Date.now() - new Date(repRow.created_at).getTime()) / 86400000
      : 0;

    const trailing30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: approved30 } = await admin
      .from('personal_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', repId)
      .eq('is_approved', true)
      .gte('created_at', trailing30);
    const { count: converted30 } = await admin
      .from('personal_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', repId)
      .eq('subscription_status', 'active')
      .gte('updated_at', trailing30);

    const rate = (approved30 ?? 0) > 0 ? (converted30 ?? 0) / (approved30 ?? 1) : 0;
    const qualityGateActive = repAgeDays < probationDays || rate < minRate;

    // --- Count today's demo_bonus rows already awarded for this rep ---
    const { count: bonusToday } = await admin
      .from('commissions')
      .select('id', { count: 'exact', head: true })
      .eq('rep_id', repId)
      .eq('commission_type', 'demo_bonus')
      .gte('created_at', todayStart.toISOString());

    const bonusIndex = (bonusToday ?? 0) + 1; // this new bonus's 1-based index today
    const cap = Number(settings?.daily_demo_cap ?? 50);
    const bonusAmount = Number(settings?.demo_bonus_amount ?? 5);

    let bonusStatus: string = 'available';
    let bonusNote: string | null = null;
    if (bonusIndex > cap) {
      bonusStatus = 'voided';
      bonusNote = `Skipped: daily cap of ${cap} demos reached`;
    } else if (qualityGateActive && bonusIndex > capDemos) {
      bonusStatus = 'locked_quality_gate';
      bonusNote = `Locked: unlock $${(cap - capDemos) * bonusAmount} more/day by reaching ${(minRate * 100).toFixed(0)}% conversion rate`;
    }

    // Idempotent insert (unique(rep_id, personal_profile_id) where demo_bonus)
    const { error: bonusErr } = await admin
      .from('commissions')
      .insert({
        rep_id: repId,
        personal_profile_id: profile.id,
        type: 'bonus',
        commission_type: 'demo_bonus',
        amount: bonusStatus === 'voided' ? 0 : bonusAmount,
        status: bonusStatus,
        period_label: periodLabel,
        points_value: 0,
        note: bonusNote ?? `Demo bonus for ${profile.full_name || 'demo'}`,
      });
    if (bonusErr && !String(bonusErr.message).includes('duplicate key')) {
      console.error('demo_bonus insert failed', bonusErr);
    }

    // --- Daily shift base (once/day when quota met) ---
    const quota = Number(settings?.daily_shift_quota ?? 10);
    const baseAmount = Number(settings?.daily_shift_base_amount ?? 50);
    const { count: approvedToday } = await admin
      .from('personal_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', repId)
      .eq('is_approved', true)
      .gte('created_at', todayStart.toISOString());

    if ((approvedToday ?? 0) >= quota) {
      const { error: baseErr } = await admin
        .from('commissions')
        .insert({
          rep_id: repId,
          type: 'shift_base',
          commission_type: 'shift_base',
          amount: baseAmount,
          status: 'available',
          period_label: periodLabel,
          points_value: 0,
          note: `Daily shift base — ${approvedToday} approved demos today`,
        });
      if (baseErr && !String(baseErr.message).includes('duplicate key')) {
        console.error('shift_base insert failed', baseErr);
      }
    }

    // --- Refresh monthly Closer's Pool tier ---
    await admin.rpc('recompute_closer_pool', {
      _rep_id: repId,
      _period_label: periodLabel,
    });

    return json({
      ok: true,
      awarded: bonusStatus,
      bonusIndex,
      qualityGateActive,
      dailyProgress: approvedToday,
    });
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
