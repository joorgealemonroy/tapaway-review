import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save, User, FileText, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { RepTaxCard } from '@/components/rep/RepTaxCard';
import { RepPayoutCard } from '@/components/rep/RepPayoutCard';
import { RepPayoutHistory } from '@/components/rep/RepPayoutHistory';
import { RepAgreementCard } from '@/components/rep/RepAgreementCard';
import { RepDemoRequestCard } from '@/components/rep/RepDemoRequestCard';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

const RepProfile = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !adminLoading && !isSalesRep) { navigate(isAdmin ? '/admin/reps' : '/'); return; }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    if (salesRep) {
      setName(salesRep.name || '');
      setPhone(salesRep.phone || '');
    }
  }, [salesRep]);

  const handleSave = async () => {
    if (!salesRep) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales_reps')
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq('id', salesRep.id);
      if (error) throw error;
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  return (
    <RepShell title="Profile & Banking" subtitle="Manage your info, tax profile, and payout details.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Personal Info */}
        <RepCard className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <User className="h-4 w-4 text-white/80" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Personal Information</p>
              <p className="text-xs text-white/40">Your contact details</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)}
                className="h-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Email</Label>
              <Input id="email" value={user?.email || ''} disabled
                className="h-10 bg-white/[0.02] border-white/10 text-white/50" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Phone</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555"
                className="h-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <Button onClick={handleSave} disabled={saving}
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a] font-semibold">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </RepCard>

        {/* 1099 Info */}
        <RepCard className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/20 shrink-0">
              <FileText className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Independent Contractor (1099)</p>
              <p className="text-xs text-white/50 leading-relaxed mt-1">
                As a TapAway sales partner, you operate as an independent contractor. You're responsible for
                your own taxes and record-keeping. We'll request your W-9 below and issue a 1099 form if
                required by law.
              </p>
            </div>
          </div>
        </RepCard>
      </div>

      {/* Nested sub-cards — kept in existing (lighter) styling but sit on dark bg like inset panels */}
      <div className="mt-5 space-y-5 [&>*]:rounded-2xl [&_.card]:rounded-2xl">
        {user && <RepPayoutCard userId={user.id} />}
        {user && <RepPayoutHistory userId={user.id} />}
        {user && <RepTaxCard userId={user.id} />}
        {user && <RepAgreementCard userId={user.id} />}
        {user && <RepDemoRequestCard userId={user.id} />}
      </div>

      <div className="mt-6">
        <Button
          variant="outline"
          onClick={signOut}
          className="w-full h-10 bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </RepShell>
  );
};

export default RepProfile;
