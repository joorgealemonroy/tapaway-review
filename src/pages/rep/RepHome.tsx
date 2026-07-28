import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Briefcase, DollarSign, Trophy, TrendingUp, ChevronDown, Zap } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RepTaxBanner } from '@/components/rep/RepTaxBanner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

const DAILY_BASE = 50;
const DEMO_QUOTA = 10;
const DEMO_BONUS = 5;
const DEMO_CAP = 50;

const RepHome = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [taxStatus, setTaxStatus] = useState<'missing' | 'submitted' | 'approved' | 'rejected'>('missing');
  const [demosToday, setDemosToday] = useState(0);
  const [pendingToday, setPendingToday] = useState(0);
  const [monthlyBounties, setMonthlyBounties] = useState(0);
  const [monthlyConversions, setMonthlyConversions] = useState(0);
  const [baseEarnedToday, setBaseEarnedToday] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !adminLoading && !isSalesRep) {
      navigate(isAdmin ? '/admin/reps' : '/');
    }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('rep_tax_profiles').select('status').eq('rep_user_id', user.id).maybeSingle();
      if (data?.status) setTaxStatus(data.status as typeof taxStatus);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !salesRep) return;
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);

      const { count: approvedCount } = await supabase
        .from('personal_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('sales_rep_id', salesRep.id)
        .eq('is_approved', true)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      setDemosToday(approvedCount ?? 0);

      const { count: pendingCount } = await supabase
        .from('personal_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('sales_rep_id', salesRep.id)
        .eq('is_approved', false)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      setPendingToday(pendingCount ?? 0);


      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount, status, commission_type, type, created_at, period_label')
        .eq('rep_id', salesRep.id);

      const currentPeriod = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const bounties = (commissions || [])
        .filter(c =>
          ['annual_bounty', 'closer_pool'].includes(c.commission_type || '') &&
          ['available', 'pending', 'paid'].includes(c.status) &&
          c.period_label === currentPeriod
        )
        .reduce((s, c) => s + Number(c.amount), 0);
      setMonthlyBounties(bounties);

      // Count paid conversions this month (for Closer's Pool milestone progress)
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count: convCount } = await supabase
        .from('personal_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('sales_rep_id', salesRep.id)
        .eq('subscription_status', 'active')
        .gte('updated_at', monthStart.toISOString());
      setMonthlyConversions(convCount ?? 0);

      const startISO = start.toISOString();
      const baseEarned = (commissions || []).some(c =>
        (c.type === 'shift_base' || c.commission_type === 'shift_base') && c.created_at >= startISO
      );
      setBaseEarnedToday(baseEarned);
      setLoading(false);
    })();
  }, [user, salesRep]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  const quotaMet = demosToday >= DEMO_QUOTA;
  const capReached = demosToday >= DEMO_CAP;
  const bonusesEarned = quotaMet ? Math.min(demosToday, DEMO_CAP) * DEMO_BONUS : 0;

  return (
    <RepShell
      title={`Welcome back${salesRep?.name ? `, ${salesRep.name.split(' ')[0]}` : ''}`}
      subtitle="Your daily cockpit — base, bonus, and recurring at a glance."
    >
      <RepTaxBanner status={taxStatus} />

      {/* Three metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RepCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
              <DollarSign className="h-5 w-5 text-emerald-300" />
            </div>
            <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
              baseEarnedToday
                ? 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30'
                : 'bg-white/5 text-white/50 border-white/10'
            }`}>
              {baseEarnedToday ? 'Earned' : 'Available'}
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Shift Base Pay</p>
          <p className="text-3xl font-semibold text-white mt-1">${DAILY_BASE}</p>
          <p className="text-xs text-white/40 mt-1">Flat daily base for hitting today's target.</p>
        </RepCard>

        <RepCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20">
              <Trophy className="h-5 w-5 text-amber-300" />
            </div>
            <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
              capReached
                ? 'bg-rose-400/15 text-rose-200 border-rose-400/30'
                : quotaMet
                ? 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30'
                : 'bg-amber-400/15 text-amber-200 border-amber-400/30'
            }`}>
              {capReached ? 'Daily Cap Reached' : quotaMet ? 'Quota Met' : `${DEMO_QUOTA - demosToday} to go`}
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Completed Demos Today</p>
          <p className="text-3xl font-semibold text-white mt-1">
            {demosToday}
            <span className="text-white/30 text-xl">
              {quotaMet ? ` / ${DEMO_CAP}` : ` / ${DEMO_QUOTA}`}
            </span>
            {quotaMet && !capReached && (
              <span className="text-white/30 text-xs ml-1">· Daily cap</span>
            )}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {capReached
              ? 'Daily 50-demo cap reached — resets at midnight.'
              : quotaMet
              ? `Bonus unlocked · +$${bonusesEarned} in production bonuses.`
              : `${DEMO_QUOTA - demosToday} more to unlock $${DEMO_BONUS}/demo bonus.`}
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full ${capReached ? 'bg-rose-400' : quotaMet ? 'bg-emerald-400' : 'bg-amber-400'} transition-all`}
              style={{
                width: `${Math.min(
                  100,
                  quotaMet ? (demosToday / DEMO_CAP) * 100 : (demosToday / DEMO_QUOTA) * 100
                )}%`,
              }}
            />
          </div>
          {pendingToday > 0 && (
            <p className="text-[11px] text-white/40 mt-2">
              Pending admin review: <span className="text-amber-200 font-semibold">{pendingToday}</span> · counts once approved.
            </p>
          )}
        </RepCard>

        <RepCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/20">
              <TrendingUp className="h-5 w-5 text-blue-300" />
            </div>
            <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full border bg-blue-400/15 text-blue-200 border-blue-400/30">
              10% Recurring
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Active Monthly Stream</p>
          <p className="text-3xl font-semibold text-white mt-1">
            ${monthlyRecurring.toFixed(2)}<span className="text-white/30 text-lg"> /mo</span>
          </p>
          <p className="text-xs text-white/40 mt-1">Passive cut from all paying accounts you converted.</p>
        </RepCard>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => !capReached && navigate('/rep/demo/new')}
          disabled={capReached}
          title={capReached ? 'Daily 50-demo cap reached — resets at midnight.' : undefined}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors ${
            capReached
              ? 'bg-emerald-500/30 text-[#0a0e1a]/60 cursor-not-allowed opacity-50'
              : 'bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400 active:scale-[0.98]'
          }`}
        >
          <Plus className="h-4 w-4" /> {capReached ? 'Daily Cap Reached' : 'Create New Demo'}
        </button>
        <button
          onClick={() => navigate('/rep/restaurants')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
        >
          <Briefcase className="h-4 w-4" /> View My Pipeline
        </button>
      </div>

      {/* How You Get Paid */}
      <Collapsible open={compOpen} onOpenChange={setCompOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full">
            <RepCard className="px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Zap className="h-4 w-4 text-emerald-300" />
                </div>
                <span className="text-sm font-semibold text-white">How You Get Paid</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${compOpen ? 'rotate-180' : ''}`} />
            </RepCard>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <RepCard className="mt-2 p-5 space-y-4 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <div className="text-emerald-300 font-mono text-xs mt-1">01</div>
              <div>
                <p className="font-semibold text-white">Daily Shift Base</p>
                <p className="text-white/50">$50 flat pay for completing your daily target.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-amber-300 font-mono text-xs mt-1">02</div>
              <div>
                <p className="font-semibold text-white">Production Bonus</p>
                <p className="text-white/50">
                  +$5 for every complete demo package you finish · unlocks at {DEMO_QUOTA} completed demos.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-blue-300 font-mono text-xs mt-1">03</div>
              <div>
                <p className="font-semibold text-white">10% Monthly Recurring</p>
                <p className="text-white/50">
                  Passive 10% of every subscriber's monthly plan for as long as they stay a customer.
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Solo Pro → $1.50/mo · Venue Pack → $3.90/mo
                </p>
              </div>
            </div>
          </RepCard>
        </CollapsibleContent>
      </Collapsible>
    </RepShell>
  );
};

export default RepHome;
