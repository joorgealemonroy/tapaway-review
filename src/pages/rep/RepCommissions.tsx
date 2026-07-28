import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

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

  const [stats, setStats] = useState({ available: 0, pending: 0, lifetime: 0 });

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
        setStats({
          available: allComm?.filter(c => c.status === 'available').reduce((s, c) => s + Number(c.amount), 0) || 0,
          pending: allComm?.filter(c => ['pending', 'trial_pending'].includes(c.status)).reduce((s, c) => s + Number(c.amount), 0) || 0,
          lifetime: allComm?.filter(c => ['available', 'paid'].includes(c.status)).reduce((s, c) => s + Number(c.amount), 0) || 0,
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

  return (
    <RepShell title="Commissions" subtitle="Track your earnings across base, bonus and recurring.">
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
        </RepCard>
        <RepCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20">
              <Clock className="h-5 w-5 text-amber-300" />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">Pending Validation</p>
          </div>
          <p className="text-3xl font-semibold text-amber-300">${stats.pending.toFixed(2)}</p>
          <p className="text-xs text-white/40 mt-1">Earnings awaiting approval</p>
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
              <div className="text-white/90">{c.restaurant_name || (c.commission_type === 'shift_base' ? 'Daily Shift' : '—')}</div>
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
