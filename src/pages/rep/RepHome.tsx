import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, DollarSign, TrendingUp, Target, Clock, ExternalLink, Copy, Home, Users, Wallet, User, BookOpen, ChevronDown, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { RepTaxBanner } from '@/components/rep/RepTaxBanner';

interface RepStats {
  availableBalance: number;
  pendingClawback: number;
  inFreeTrial: number;
  totalPaid: number;
  pointsThisMonth: number;
  bonusThreshold: number;
  bonusAmount: number;
  closesThisMonth: number;
}

interface DemoRestaurant {
  id: string;
  restaurant_name: string;
  review_hub_url: string | null;
  custom_slug: string | null;
}

const RepHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const [stats, setStats] = useState<RepStats>({
    availableBalance: 0,
    pendingClawback: 0,
    inFreeTrial: 0,
    totalPaid: 0,
    pointsThisMonth: 0,
    bonusThreshold: 15,
    bonusAmount: 600,
    closesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [taxStatus, setTaxStatus] = useState<'missing' | 'submitted' | 'approved' | 'rejected'>('missing');
  const [demoRestaurant, setDemoRestaurant] = useState<DemoRestaurant | null>(null);
  const [demoLoading, setDemoLoading] = useState(true);
  const [compOpen, setCompOpen] = useState(false);

  useEffect(() => {
    const loadDemo = async () => {
      setDemoLoading(true);
      const { data } = await supabase
        .from('restaurants')
        .select('id, restaurant_name, review_hub_url, custom_slug')
        .eq('is_demo_account', true)
        .limit(1)
        .maybeSingle();
      if (data) setDemoRestaurant(data);
      setDemoLoading(false);
    };
    loadDemo();
  }, []);

  useEffect(() => {
    const loadTaxStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('rep_tax_profiles')
        .select('status')
        .eq('rep_user_id', user.id)
        .maybeSingle();
      if (data?.status) setTaxStatus(data.status as typeof taxStatus);
    };
    if (user) loadTaxStatus();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !isSalesRep) { navigate('/'); return; }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!salesRep) return;
      try {
        const { data: commissions } = await supabase
          .from('commissions')
          .select('amount, status, type, commission_type, points_value, period_label')
          .eq('rep_id', salesRep.id);

        const now = new Date();
        const currentPeriod = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const available = commissions?.filter(c => c.status === 'available').reduce((s, c) => s + Number(c.amount), 0) || 0;
        const pending = commissions?.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0) || 0;
        const trial = commissions?.filter(c => c.status === 'trial_pending').reduce((s, c) => s + Number(c.amount), 0) || 0;
        const paid = commissions?.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0) || 0;
        const pointsThisMonth = commissions
          ?.filter(c => c.period_label === currentPeriod && (c.commission_type === 'upfront' || c.commission_type === null))
          .reduce((s, c) => s + Number(c.points_value || 0), 0) || 0;

        const closesThisMonth = commissions
          ?.filter(c => c.period_label === currentPeriod && (c.commission_type === 'upfront' || c.type === 'close'))
          .length || 0;

        // Get bonus settings
        const { data: compSettings } = await supabase
          .from('rep_compensation_settings')
          .select('bonus_point_threshold, bonus_amount')
          .limit(1)
          .single();

        setStats({
          availableBalance: available,
          pendingClawback: pending,
          inFreeTrial: trial,
          totalPaid: paid,
          pointsThisMonth,
          bonusThreshold: Number(compSettings?.bonus_point_threshold ?? 15),
          bonusAmount: Number(compSettings?.bonus_amount ?? 600),
          closesThisMonth,
        });
      } catch (error) {
        console.error('Error fetching rep stats:', error);
      } finally {
        setLoading(false);
      }
    };
    if (salesRep) fetchStats();
  }, [salesRep]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const bonusPercentage = Math.min((stats.pointsThisMonth / stats.bonusThreshold) * 100, 100);
  const hasEarnedBonus = stats.pointsThisMonth >= stats.bonusThreshold;

  const navItems = [
    { icon: Home, label: 'Home', path: '/rep' },
    { icon: Users, label: 'Restaurants', path: '/rep/restaurants' },
    { icon: Wallet, label: 'Commissions', path: '/rep/commissions' },
    { icon: BookOpen, label: 'Docs', path: '/rep/docs' },
    { icon: User, label: 'Profile', path: '/rep/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-md px-4 pb-24 sm:max-w-3xl">
        {/* Hero */}
        <div className="flex flex-col items-center pt-3 pb-3">
          <div className="w-full max-w-[280px] h-14 overflow-hidden mb-2">
            <img src="/tapaway-logo.svg" alt="TapAway" className="w-full h-auto -mt-[38%] -mb-[32%]" style={{ mixBlendMode: 'multiply', filter: 'contrast(1.1)' }} />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Sales Partner Portal</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">
            Welcome back{salesRep?.name ? `, ${salesRep.name.split(' ')[0]}` : ''}
          </h1>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-2 mb-4">
          {navItems.map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${location.pathname === item.path ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <RepTaxBanner status={taxStatus} />

        {/* Earnings Grid — 2x2 */}
        <div className="grid grid-cols-2 gap-3 mt-4 mb-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Available</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${stats.availableBalance.toFixed(0)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">${stats.pendingClawback.toFixed(0)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">60-day clawback hold</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">In Trial</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">${stats.inFreeTrial.toFixed(0)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting first payment</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">${stats.totalPaid.toFixed(0)}</p>
          </div>
        </div>

        {/* Bonus Tracker */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4 mb-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
            🎯 Monthly Bonus Tracker
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">
                {stats.pointsThisMonth} / {stats.bonusThreshold} Points
              </span>
              <span className="font-semibold text-slate-900">
                {hasEarnedBonus ? '🎉 Bonus Earned!' : `$${stats.bonusAmount} at ${stats.bonusThreshold} pts`}
              </span>
            </div>
            <Progress value={bonusPercentage} className="h-3" />
            <p className="text-xs text-slate-500">
              Venue = 1 pt · Solo = 0.5 pts · Points activate after customer's trial ends
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <button onClick={() => navigate('/rep/close')}
          className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-bold bg-emerald-500 text-white shadow-md mb-3 active:scale-[0.98] transition-transform">
          <Plus className="mr-2 h-5 w-5" /> Close a Restaurant Now
        </button>
        <button onClick={() => navigate('/rep/restaurants')}
          className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-semibold border border-slate-200 bg-white text-slate-900 shadow-sm mb-5 active:scale-[0.98] transition-transform">
          View My Restaurants
        </button>

        {/* Compensation Breakdown */}
        <Collapsible open={compOpen} onOpenChange={setCompOpen}>
          <CollapsibleTrigger className="w-full rounded-2xl bg-white shadow-sm border border-slate-200 p-4 flex items-center justify-between text-left mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">How You Get Paid</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${compOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4 mb-5 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Venue Pack (Restaurant)</p>
                <p>Monthly: $30 upfront + $4/mo recurring · 1 point</p>
                <p>Annual: $60 upfront + $40/yr recurring · 1 point</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Solo Pro (Business Lite)</p>
                <p>Monthly: $10 upfront + $1.50/mo recurring · 0.5 points</p>
                <p>Annual: $25 upfront + $15/yr recurring · 0.5 points</p>
              </div>
              <div className="border-t pt-3 space-y-1">
                <p><strong>Volume Bonus:</strong> Earn ${stats.bonusAmount} for every {stats.bonusThreshold} points in a month</p>
                <p><strong>Trial Hold:</strong> Commissions start as "In Trial" until the customer's first real payment</p>
                <p><strong>Monthly Clawback:</strong> Monthly upfronts are held for 60 days — if the customer cancels, it's clawed back</p>
                <p><strong>Annual:</strong> No clawback — available immediately after first payment</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Demo Restaurant */}
        {!demoLoading && demoRestaurant && (
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Demo Restaurant Dashboard</h3>
            <p className="text-xs text-slate-500 mt-1">Show owners what TapAway looks like with real data.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a href={`/dashboard?demo_restaurant_id=${demoRestaurant.id}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold bg-slate-900 text-white active:scale-[0.98] transition-transform">
                <ExternalLink className="mr-2 h-4 w-4" /> View Demo Dashboard
              </a>
              {(demoRestaurant.review_hub_url || demoRestaurant.custom_slug) && (
                <button onClick={async () => {
                  const hubUrl = demoRestaurant.review_hub_url || `https://tapaway.co/${demoRestaurant.custom_slug}`;
                  await navigator.clipboard.writeText(hubUrl);
                  toast.success("Demo review hub link copied!");
                }} className="flex-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium border border-slate-200 bg-white text-slate-900 active:scale-[0.98] transition-transform">
                  <Copy className="mr-2 h-4 w-4" /> Copy Demo Review Link
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                <Icon className="h-5 w-5" /><span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default RepHome;
