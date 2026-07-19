import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

const slugify = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'demo'}-${suffix}`;
};

const DEMO_CAP = 50;
const TRIAL_DAYS = 7;

const RepDemoCreate = () => {
  const navigate = useRepNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !adminLoading && !isSalesRep) navigate(isAdmin ? '/admin/reps' : '/');
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  // Legacy /rep/demo/:id edit URLs go straight to the real Business dashboard now.
  useEffect(() => {
    if (editId) {
      navigate(`/dashboard?profile_id=${editId}`);
    }
  }, [editId, navigate]);

  const handleCreate = async () => {
    if (!user || !salesRep) return;
    const name = businessName.trim();
    if (!name) return toast.error('Business name is required');
    if (!businessPhone.trim()) return toast.error('Business phone is required');

    setSaving(true);
    try {
      // 50-demo daily cap on rep-created demos.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: todayCount, error: countError } = await supabase
        .from('personal_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('sales_rep_id', salesRep.id)
        .gte('created_at', startOfDay.toISOString());
      if (countError) throw countError;
      if ((todayCount ?? 0) >= DEMO_CAP) {
        toast.error("You've hit the 50-demo daily cap. Please continue tomorrow.");
        setSaving(false);
        return;
      }

      // Generate a unique username slug (retry a few times if collision).
      let username = slugify(name);
      for (let i = 0; i < 5; i++) {
        const { data: available } = await supabase.rpc('is_username_available', {
          check_username: username,
        });
        if (available === true) break;
        username = slugify(name);
      }

      const emailPlaceholder =
        contactEmail.trim() || `${username}@demo.tapaway.local`;

      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const { data: inserted, error } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: user.id,
          username,
          full_name: name,
          email: emailPlaceholder,
          plan_type: 'solo_pro',
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt,
          business_phone: businessPhone.trim(),
          contact_phone: businessPhone.trim(),
          sales_rep_id: salesRep.id,
          created_by_rep_id: salesRep.id,
          is_approved: false,
          pipeline_status: 'draft',
          header_type: 'color',
          header_color: '#0a0e1a',
          background_color: '#ffffff',
          show_username: true,
        } as any)
        .select('id, username')
        .single();

      if (error) throw error;

      toast.success('Demo created — opening dashboard');
      navigate(`/dashboard?profile_id=${inserted!.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create demo');
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

  const inputCls = 'bg-white/[0.03] border-white/10 text-white placeholder:text-white/30';

  return (
    <RepShell
      title="New Demo Hub"
      subtitle="Step 1 · basic info · pending admin approval"
    >
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/rep/restaurants')}
          className="text-white/60 hover:text-white -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Pipeline
        </Button>
      </div>

      <RepCard className="p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex-shrink-0">
            <Building2 className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Create a Business demo hub</h3>
            <p className="text-sm text-white/60 mt-1">
              Enter the business basics. You'll land in the real Business dashboard next — same
              draggable blocks, hero editor, and design tools the owner sees. Upload the printed
              card PDF from the pipeline once you're happy with the layout.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Business Name *</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Joe's Pizza"
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-white/70">Business Phone *</Label>
            <Input
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="+1 555 555 5555"
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-white/70">
              Owner Email <span className="text-white/40">(optional — used when they claim the account)</span>
            </Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="owner@business.com"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button
            variant="ghost"
            onClick={() => navigate('/rep/restaurants')}
            className="text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create & open dashboard'}
            <CheckCircle2 className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </RepCard>
    </RepShell>
  );
};

export default RepDemoCreate;
