import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Clock, TrendingUp, FileText, Landmark, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

const DEMO_BONUS = 5;

interface Commission {
  id: string;
  type: string;
  commission_type: string | null;
  plan_tier: string | null;
  billing_cycle: string | null;
  amount: number;
  status: string;
  period_label: string;
  note: string | null;
  created_at: string;
  rep_restaurant_id: string | null;
  restaurant_name?: string;
}

const STATUS_STYLES: Record<string, string> = {
  trial_pending: 'bg-blue-400/10 text-blue-200 border-blue-400/20',
  available: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20',
  pending: 'bg-amber-400/10 text-amber-200 border-amber-400/20',
  paid: 'bg-emerald-400/15 text-emerald-100 border-emerald-400/30',
  voided: 'bg-white/5 text-white/40 border-white/10',
  clawed_back: 'bg-red-400/10 text-red-200 border-red-400/20',
  locked_quality_gate: 'bg-purple-400/10 text-purple-200 border-purple-400/20',
};

const STATUS_LABELS: Record<string, string> = {
  trial_pending: 'In Trial',
  available: 'Available',
  pending: 'Pending',
  paid: 'Paid',
  voided: 'Voided',
  clawed_back: 'Clawed Back',
  locked_quality_gate: 'Quality Gate',
};

const typeLabel = (c: Commission) => {
  const ct = c.commission_type || c.type;
  switch (ct) {
    case 'shift_base': return 'Daily Base ($50)';
    case 'demo_bonus': return 'Demo Bonus ($5)';
    case 'annual_bounty': return 'Annual Bounty ($75)';
    case 'closer_pool': return "Closer's Pool";
    case 'bonus': return 'Production Bonus';
    case 'recurring': return 'Recurring (legacy)';
    case 'upfront': return 'Upfront (legacy)';
    default: return ct || '—';
  }
};

const RepCommissions = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [stats, setStats] = useState({ available: 0, pending: 0, lifetime: 0, pendingDemoCount: 0, pendingDemoAmount: 0 });
  const [taxStatus, setTaxStatus] = useState<'missing' | 'submitted' | 'approved' | 'rejected'>('missing');
  const [hasBankDetails, setHasBankDetails] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [tax, bank] = await Promise.all([
        supabase.from('rep_tax_profiles').select('status').eq('rep_user_id', user.id).maybeSingle(),
        supabase.from('rep_payout_accounts').select('id').eq('rep_user_id', user.id).maybeSingle(),
      ]);
      if (tax.data?.status) setTaxStatus(tax.data.status as typeof taxStatus);
      setHasBankDetails(!!bank.data);
    })();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !adminLoading && !isSalesRep) { navigate(isAdmin ? '/admin/reps' : '/'); return; }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    const fetchCommissions = async () => {
      if (!salesRep) return;
      try {
        let query = supabase
          .from('commissions')
          .select('*, rep_restaurants:rep_restaurant_id (name), personal_profiles:personal_profile_id (full_name, username)')
          .eq('rep_id', salesRep.id)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        if (typeFilter !== 'all') {
          if (['shift_base', 'bonus', 'demo_bonus', 'annual_bounty', 'closer_pool', 'upfront', 'recurring'].includes(typeFilter)) {
            query = query.eq('commission_type', typeFilter);
          } else {
            query = query.eq('type', typeFilter);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        const mapped = (data || []).map((c: any) => ({
          ...c,
          restaurant_name:
            c.rep_restaurants?.name ||
            c.personal_profiles?.full_name ||
            (c.personal_profiles?.username ? '@' + c.personal_profiles.username : null),
        }));
        setCommissions(mapped);

        const { data: allComm } = await supabase
          .from('commissions').select('amount, status').eq('rep_id', salesRep.id);

        // Count demos submitted for admin review but not yet approved — these
        // will each earn a $5 demo_bonus on approval but have no commission row yet.
        const { count: pendingDemoCount } = await supabase
          .from('personal_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('is_approved', false)
          .not('submitted_for_review_at', 'is', null);

        const pendingCommissionAmount =
          allComm?.filter(c => ['pending', 'trial_pending'].includes(c.status))
            .reduce((s, c) => s + Number(c.amount), 0) || 0;
        const pendingDemoAmount = (pendingDemoCount ?? 0) * DEMO_BONUS;

        setStats({
          available: allComm?.filter(c => c.status === 'available').reduce((s, c) => s + Number(c.amount), 0) || 0,
          pending: pendingCommissionAmount + pendingDemoAmount,
          lifetime: allComm?.filter(c => ['available', 'paid'].includes(c.status)).reduce((s, c) => s + Number(c.amount), 0) || 0,
          pendingDemoCount: pendingDemoCount ?? 0,
          pendingDemoAmount,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (salesRep) fetchCommissions();
  }, [salesRep, statusFilter, typeFilter]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  const w9Label =
    taxStatus === 'approved' ? 'On file' :
    taxStatus === 'submitted' ? 'Pending review' :
    taxStatus === 'rejected' ? 'Rejected — re-upload' : 'Missing';
  const w9Ok = taxStatus === 'approved';
  const w9Warn = taxStatus === 'submitted';

  return (
    <RepShell title="Commissions" subtitle="Track your earnings and payout readiness.">
      {/* Payout readiness strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => navigate('/rep/profile')}
          className={`text-left rounded-2xl border p-4 flex items-center gap-3 transition-colors ${
            w9Ok
              ? 'bg-emerald-500/5 border-emerald-400/20 hover:bg-emerald-500/10'
              : w9Warn
              ? 'bg-amber-500/5 border-amber-400/20 hover:bg-amber-500/10'
              : 'bg-red-500/5 border-red-400/20 hover:bg-red-500/10'
          }`}
        >
          <div className={`p-2 rounded-xl border ${w9Ok ? 'bg-emerald-500/10 border-emerald-400/20' : w9Warn ? 'bg-amber-500/10 border-amber-400/20' : 'bg-red-500/10 border-red-400/20'}`}>
            {w9Ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <FileText className={`h-4 w-4 ${w9Warn ? 'text-amber-300' : 'text-red-300'}`} />}
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">W-9 Tax Form</p>
            <p className="text-sm font-semibold text-white mt-0.5">{w9Label}</p>
            <p className="text-[11px] text-white/50 mt-0.5">Required before commissions can be paid out.</p>
          </div>
          {!w9Ok && <ArrowRight className="h-4 w-4 text-white/40" />}
        </button>

        <button
          onClick={() => navigate('/rep/profile')}
          className={`text-left rounded-2xl border p-4 flex items-center gap-3 transition-colors ${
            hasBankDetails
              ? 'bg-emerald-500/5 border-emerald-400/20 hover:bg-emerald-500/10'
              : 'bg-red-500/5 border-red-400/20 hover:bg-red-500/10'
          }`}
        >
          <div className={`p-2 rounded-xl border ${hasBankDetails ? 'bg-emerald-500/10 border-emerald-400/20' : 'bg-red-500/10 border-red-400/20'}`}>
            {hasBankDetails ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Landmark className="h-4 w-4 text-red-300" />}
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Bank Details (ACH)</p>
            <p className="text-sm font-semibold text-white mt-0.5">{hasBankDetails ? 'On file' : 'Missing'}</p>
            <p className="text-[11px] text-white/50 mt-0.5">Where we send your payouts.</p>
          </div>
          {!hasBankDetails && <ArrowRight className="h-4 w-4 text-white/40" />}
        </button>
      </div>

      {(!w9Ok || !hasBankDetails) && (
        <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-200/80 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Payouts pause until both your W-9 and bank details are on file.
        </div>
      )}


      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RepCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
              <DollarSign className="h-5 w-5 text-emerald-300" />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Available Balance</p>
          </div>
          <p className="text-3xl font-semibold text-emerald-300">${stats.available.toFixed(2)}</p>
          <p className="text-xs text-white/40 mt-1">Ready for ACH transfer</p>
          {(() => {
            const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
            const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
            const bonuses = commissions.filter(c => c.commission_type === 'demo_bonus' && new Date(c.created_at) >= monthStart);
            const demosToday = commissions.filter(c => c.commission_type === 'demo_bonus' && new Date(c.created_at) >= todayStart).length;
            const baseToday = commissions.find(c => c.commission_type === 'shift_base' && new Date(c.created_at) >= todayStart);
            const QUOTA = 10;
            return (
              <>
                {bonuses.length > 0 && (
                  <p className="text-[11px] text-emerald-300/70 mt-2">Demo bonuses this month: {bonuses.length} × $5 = ${bonuses.reduce((s, c) => s + Number(c.amount), 0).toFixed(2)}</p>
                )}
                <p className="text-[11px] mt-1 text-white/50">
                  {baseToday
                    ? <>Daily base earned today: <span className="text-emerald-300 font-semibold">+$50</span></>
                    : <>Daily $50 base: <span className="text-white/80 font-semibold">{Math.min(demosToday, QUOTA)}/{QUOTA}</span> demos approved today</>}
                </p>
              </>
            );
          })()}
        </RepCard>
        <RepCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20">
              <Clock className="h-5 w-5 text-amber-300" />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Pending Validation</p>
          </div>
          <p className="text-3xl font-semibold text-amber-300">${stats.pending.toFixed(2)}</p>
          <p className="text-xs text-white/40 mt-1">
            {stats.pendingDemoCount > 0
              ? `${stats.pendingDemoCount} demo${stats.pendingDemoCount === 1 ? '' : 's'} awaiting admin review · $${stats.pendingDemoAmount.toFixed(2)}`
              : 'Earnings awaiting approval'}
          </p>
        </RepCard>
        <RepCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/20">
              <TrendingUp className="h-5 w-5 text-blue-300" />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Lifetime Earned</p>
          </div>
          <p className="text-3xl font-semibold text-white">${stats.lifetime.toFixed(2)}</p>
          <p className="text-xs text-white/40 mt-1">All time</p>
        </RepCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/[0.03] border-white/10 text-white/80">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#0f1420] border-white/10 text-white/80">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="trial_pending">In Trial</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
            <SelectItem value="clawed_back">Clawed Back</SelectItem>
            <SelectItem value="locked_quality_gate">Quality Gate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 bg-white/[0.03] border-white/10 text-white/80">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#0f1420] border-white/10 text-white/80">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="shift_base">Daily Base ($50)</SelectItem>
            <SelectItem value="demo_bonus">Demo Bonus ($5)</SelectItem>
            <SelectItem value="annual_bounty">Annual Bounty ($75)</SelectItem>
            <SelectItem value="closer_pool">Closer's Pool</SelectItem>
            <SelectItem value="upfront">Upfront (legacy)</SelectItem>
            <SelectItem value="recurring">Recurring (legacy)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ledger */}
      <RepCard className="overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1fr_2fr_1.2fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/5 bg-white/[0.02] text-[10px] font-semibold text-white/40 uppercase tracking-widest">
          <div>Date</div>
          <div>Business / Shift</div>
          <div>Type</div>
          <div>Amount</div>
          <div>Status</div>
        </div>

        {commissions.length === 0 ? (
          <div className="text-center py-14 text-white/40 text-sm">
            No commissions yet. Start closing businesses to earn.
          </div>
        ) : (
          commissions.map(c => (
            <div
              key={c.id}
              className="grid grid-cols-2 md:grid-cols-[1fr_2fr_1.2fr_1fr_1fr] gap-2 md:gap-4 px-5 py-3.5 border-b border-white/5 last:border-b-0 items-center text-sm"
            >
              <div className="text-white/60">{format(new Date(c.created_at), 'MMM d, yyyy')}</div>
              <div className="text-white/90">{c.restaurant_name || (c.commission_type === 'shift_base' ? 'Daily Shift' : c.commission_type === 'closer_pool' ? "Monthly Closer's Pool" : '—')}</div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.03] text-white/70 text-[11px] font-medium">
                  {typeLabel(c)}
                </span>
              </div>
              <div className="font-semibold text-emerald-300">${Number(c.amount).toFixed(2)}</div>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${STATUS_STYLES[c.status] || 'bg-white/5 text-white/50 border-white/10'}`}>
                  {STATUS_LABELS[c.status] || c.status}
                </span>
              </div>
            </div>
          ))
        )}
      </RepCard>
    </RepShell>
  );
};

export default RepCommissions;
