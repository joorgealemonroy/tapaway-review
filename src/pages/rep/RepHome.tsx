import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Briefcase, Sparkles, Rocket, Palette } from 'lucide-react';
import { RepTaxBanner } from '@/components/rep/RepTaxBanner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

const CANVA_TEMPLATE_URL = 'https://canva.link/tapaway-temp';

const ENCOURAGEMENTS = [
  'Every demo is a door opened.',
  'One great hub can change a business owner\'s week.',
  'Hard work beats talent when talent fails to work hard — ship the next demo.',
  'You\'re building someone\'s digital storefront. That matters.',
  'Consistency is the whole game. Keep going.',
];

const RepHome = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [taxStatus, setTaxStatus] = useState<'missing' | 'submitted' | 'approved' | 'rejected'>('missing');
  const [demosToday, setDemosToday] = useState(0);
  const [demosThisWeek, setDemosThisWeek] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
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
    if (!salesRep) return;
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);

      const [todayRes, weekRes, pendingRes, totalRes] = await Promise.all([
        supabase.from('personal_profiles').select('id', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id).eq('is_approved', true)
          .gte('created_at', start.toISOString()),
        supabase.from('personal_profiles').select('id', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .gte('created_at', weekStart.toISOString()),
        supabase.from('personal_profiles').select('id', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id).eq('is_approved', false)
          .not('submitted_for_review_at', 'is', null),
        supabase.from('personal_profiles').select('id', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id),
      ]);

      setDemosToday(todayRes.count ?? 0);
      setDemosThisWeek(weekRes.count ?? 0);
      setPendingReview(pendingRes.count ?? 0);
      setTotalBusinesses(totalRes.count ?? 0);
      setLoading(false);
    })();
  }, [salesRep]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  const encouragement = ENCOURAGEMENTS[new Date().getDate() % ENCOURAGEMENTS.length];
  const firstName = salesRep?.name?.split(' ')[0] || 'partner';

  return (
    <RepShell
      title={`Welcome back, ${firstName}`}
      subtitle="Your daily cockpit — stay focused on building great hubs."
    >
      <RepTaxBanner status={taxStatus} repId={salesRep?.id} />

      {/* Positive hero */}
      <RepCard className="p-6 mb-5 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 100% 0%, rgba(16,185,129,0.14), transparent 60%)',
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
            <Sparkles className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Today</p>
            <p className="text-xl sm:text-2xl font-semibold text-white mt-1 leading-tight">
              {encouragement}
            </p>
            <p className="text-sm text-white/50 mt-2">
              {demosThisWeek === 0
                ? 'Fresh week — your first demo is one click away.'
                : `You've started ${demosThisWeek} ${demosThisWeek === 1 ? 'hub' : 'hubs'} in the last 7 days. Keep the streak alive.`}
            </p>
          </div>
        </div>
      </RepCard>

      {/* Non-financial stat trio */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <RepCard className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Built Today</p>
          <p className="text-3xl font-semibold text-white mt-1">{demosToday}</p>
          <p className="text-[11px] text-white/40 mt-1">Approved demos</p>
        </RepCard>
        <RepCard className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">This Week</p>
          <p className="text-3xl font-semibold text-white mt-1">{demosThisWeek}</p>
          <p className="text-[11px] text-white/40 mt-1">Hubs started</p>
        </RepCard>
        <RepCard className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">In Review</p>
          <p className="text-3xl font-semibold text-white mt-1">{pendingReview}</p>
          <p className="text-[11px] text-white/40 mt-1">Awaiting admin</p>
        </RepCard>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => navigate('/rep/demo/new')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400 active:scale-[0.98] transition-colors"
        >
          <Plus className="h-4 w-4" /> Create New Demo
        </button>
        <button
          onClick={() => navigate('/rep/restaurants')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
        >
          <Briefcase className="h-4 w-4" /> My Businesses{totalBusinesses ? ` · ${totalBusinesses}` : ''}
        </button>
      </div>

      {/* Helpers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={CANVA_TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-colors flex items-start gap-3"
        >
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-400/20">
            <Palette className="h-4 w-4 text-purple-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Canva Card Template</p>
            <p className="text-xs text-white/50 mt-0.5">Drop the client's logo and export the print-ready PDF.</p>
          </div>
        </a>
        <button
          onClick={() => navigate('/rep/docs')}
          className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-colors flex items-start gap-3"
        >
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/20">
            <Rocket className="h-4 w-4 text-blue-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Pitch playbook</p>
            <p className="text-xs text-white/50 mt-0.5">Scripts, objection handling, and the full close flow.</p>
          </div>
        </button>
      </div>
    </RepShell>
  );
};

export default RepHome;
