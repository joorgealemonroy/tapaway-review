import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, DollarSign, TrendingUp, Target, Calendar, ExternalLink, Copy, Home, Users, Wallet, User, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { RepTaxBanner } from '@/components/rep/RepTaxBanner';

interface RepStats {
  closesToday: number;
  closesThisMonth: number;
  lifetimeCloses: number;
  pendingCommission: number;
  paidCommission: number;
  bonusProgress: number;
  bonusThreshold: number;
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
    closesToday: 0,
    closesThisMonth: 0,
    lifetimeCloses: 0,
    pendingCommission: 0,
    paidCommission: 0,
    bonusProgress: 0,
    bonusThreshold: 30,
  });
  const [loading, setLoading] = useState(true);
  
  // Tax profile status
  const [taxStatus, setTaxStatus] = useState<'missing' | 'submitted' | 'approved' | 'rejected'>('missing');
  
  // Demo restaurant loader
  const [demoRestaurant, setDemoRestaurant] = useState<DemoRestaurant | null>(null);
  const [demoLoading, setDemoLoading] = useState(true);

  // Load demo restaurant
  useEffect(() => {
    const loadDemo = async () => {
      setDemoLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, restaurant_name, review_hub_url, custom_slug')
        .eq('is_demo_account', true)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setDemoRestaurant(data);
      }
      setDemoLoading(false);
    };

    loadDemo();
  }, []);

  // Load tax profile status
  useEffect(() => {
    const loadTaxStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('rep_tax_profiles')
        .select('status')
        .eq('rep_user_id', user.id)
        .maybeSingle();
      
      if (data?.status) {
        setTaxStatus(data.status as typeof taxStatus);
      }
    };

    if (user) {
      loadTaxStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !isSalesRep) {
      navigate('/');
      return;
    }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!salesRep) return;

      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Fetch closes today
        const { count: closesToday } = await supabase
          .from('rep_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('status', 'closed')
          .gte('closed_at', todayStart);

        // Fetch closes this month
        const { count: closesThisMonth } = await supabase
          .from('rep_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('status', 'closed')
          .gte('closed_at', monthStart);

        // Fetch lifetime closes
        const { count: lifetimeCloses } = await supabase
          .from('rep_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('status', 'closed');

        // Fetch commissions
        const { data: commissions } = await supabase
          .from('commissions')
          .select('amount, status')
          .eq('rep_id', salesRep.id);

        const pendingCommission = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const paidCommission = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // Fetch bonus threshold from settings (we'll use default if not accessible)
        const bonusThreshold = 30; // Default value

        setStats({
          closesToday: closesToday || 0,
          closesThisMonth: closesThisMonth || 0,
          lifetimeCloses: lifetimeCloses || 0,
          pendingCommission,
          paidCommission,
          bonusProgress: closesThisMonth || 0,
          bonusThreshold,
        });
      } catch (error) {
        console.error('Error fetching rep stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (salesRep) {
      fetchStats();
    }
  }, [salesRep]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const bonusPercentage = Math.min((stats.bonusProgress / stats.bonusThreshold) * 100, 100);
  const hasEarnedBonus = stats.bonusProgress >= stats.bonusThreshold;
  const nextBonusAt = Math.ceil(stats.bonusProgress / stats.bonusThreshold) * stats.bonusThreshold + stats.bonusThreshold;

  const navItems = [
    { icon: Home, label: 'Home', path: '/rep' },
    { icon: Users, label: 'Restaurants', path: '/rep/restaurants' },
    { icon: Wallet, label: 'Commissions', path: '/rep/commissions' },
    { icon: BookOpen, label: 'Docs', path: '/rep/docs' },
    { icon: User, label: 'Profile', path: '/rep/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile-first container */}
      <div className="mx-auto w-full max-w-md px-4 pb-24 sm:max-w-3xl">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center pt-3 pb-3">
          {/* Logo - cropped and centered */}
          <div className="w-full max-w-[280px] h-14 overflow-hidden mb-2">
            <img 
              src="/tapaway-logo.svg" 
              alt="TapAway" 
              className="w-full h-auto -mt-[38%] -mb-[32%]"
              style={{ 
                mixBlendMode: 'multiply',
                filter: 'contrast(1.1)'
              }} 
            />
          </div>
          
          {/* Text block */}
          <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Sales Partner Portal
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">
            Welcome back{salesRep?.name ? `, ${salesRep.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-600 mt-1 leading-snug">
            Track your closes, commissions, and show owners TapAway in action.
          </p>
        </div>

        {/* Desktop nav - hidden on mobile */}
        <nav className="hidden sm:flex gap-2 mb-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Tax Banner - show if not approved */}
        <RepTaxBanner status={taxStatus} />

        {/* Stats Grid - 2x2, larger cards */}
        <div className="grid grid-cols-2 gap-3 mt-4 mb-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Today</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.closesToday}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">This Month</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.closesThisMonth}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-slate-400" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Lifetime</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.lifetimeCloses}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${stats.pendingCommission}</p>
            <p className="text-xs text-slate-400 mt-1">${stats.paidCommission} paid</p>
          </div>
        </div>

        {/* Bonus Progress Card */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4 mb-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
            🎯 Monthly Bonus Progress
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">
                {stats.bonusProgress} / {stats.bonusThreshold} closes
              </span>
              <span className="font-semibold text-slate-900">
                {hasEarnedBonus ? '🎉 Bonus Earned!' : `$500 at ${stats.bonusThreshold}`}
              </span>
            </div>
            <Progress value={bonusPercentage} className="h-3" />
            {hasEarnedBonus && (
              <p className="text-sm text-emerald-600 font-medium">
                Congratulations! Next bonus at {nextBonusAt} closes.
              </p>
            )}
          </div>
        </div>

        {/* Primary CTA */}
        <button 
          onClick={() => navigate('/rep/close')}
          className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-bold bg-emerald-500 text-white shadow-md mb-3 active:scale-[0.98] transition-transform"
        >
          <Plus className="mr-2 h-5 w-5" />
          Close a Restaurant Now
        </button>

        {/* Secondary CTA */}
        <button 
          onClick={() => navigate('/rep/restaurants')}
          className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-semibold border border-slate-200 bg-white text-slate-900 shadow-sm mb-5 active:scale-[0.98] transition-transform"
        >
          View My Restaurants
        </button>

        {/* Demo Restaurant Card */}
        {!demoLoading && demoRestaurant && (
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Demo Restaurant Dashboard
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Use this to show owners what TapAway looks like with real data.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {/* View Demo Dashboard */}
              <a
                href={`/dashboard?demo_restaurant_id=${demoRestaurant.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold bg-slate-900 text-white active:scale-[0.98] transition-transform"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Demo Dashboard
              </a>

              {/* Copy Review Hub Link */}
              {(demoRestaurant.review_hub_url || demoRestaurant.custom_slug) && (
                <button
                  onClick={async () => {
                    const hubUrl = demoRestaurant.review_hub_url || 
                      `https://tapaway.co/${demoRestaurant.custom_slug}`;
                    await navigator.clipboard.writeText(hubUrl);
                    toast.success("Demo review hub link copied!");
                  }}
                  className="flex-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium border border-slate-200 bg-white text-slate-900 active:scale-[0.98] transition-transform"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Demo Review Link
                </button>
              )}
            </div>

            {(demoRestaurant.review_hub_url || demoRestaurant.custom_slug) && (
              <p className="mt-3 text-[11px] text-slate-400 break-all">
                {demoRestaurant.review_hub_url || `https://tapaway.co/${demoRestaurant.custom_slug}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default RepHome;
