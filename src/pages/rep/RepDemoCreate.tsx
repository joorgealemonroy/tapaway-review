import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const DEMO_CAP = 50;
const TRIAL_DAYS = 7;

const randomSlug = () => `demo-${Math.random().toString(36).slice(2, 8)}`;

const RepDemoCreate = () => {
  const navigate = useRepNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [status, setStatus] = useState('Spinning up your demo…');
  const startedRef = useRef(false);

  // Legacy /rep/demo/:id → jump straight into the real dashboard for that profile.
  useEffect(() => {
    if (editId) navigate(`/dashboard?profile_id=${editId}`);
  }, [editId, navigate]);

  useEffect(() => {
    if (editId) return;
    if (authLoading || repLoading || adminLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isSalesRep) {
      navigate(isAdmin ? '/admin/reps' : '/');
      return;
    }
    if (!salesRep) return;
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        // Daily cap
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
          navigate('/rep/restaurants');
          return;
        }

        // Unique username slug
        let username = randomSlug();
        for (let i = 0; i < 5; i++) {
          const { data: available } = await supabase.rpc('is_username_available', {
            check_username: username,
          });
          if (available === true) break;
          username = randomSlug();
        }

        const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const { data: inserted, error } = await supabase
          .from('personal_profiles')
          .insert({
            user_id: user.id,
            username,
            full_name: 'Untitled Demo',
            email: `${username}@demo.tapaway.local`,
            plan_type: 'solo_pro',
            subscription_status: 'trialing',
            trial_ends_at: trialEndsAt,
            sales_rep_id: salesRep.id,
            created_by_rep_id: salesRep.id,
            is_approved: false,
            pipeline_status: 'draft',
            header_type: 'color',
            header_color: '#0a0e1a',
            background_color: '#ffffff',
            show_username: true,
          } as any)
          .select('id')
          .single();

        if (error) throw error;

        setStatus('Opening dashboard…');
        const adminViewRep = searchParams.get('admin_view_rep');
        const qs = adminViewRep
          ? `profile_id=${inserted!.id}&admin_view_rep=${adminViewRep}`
          : `profile_id=${inserted!.id}`;
        navigate(`/dashboard?${qs}`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to create demo');
        navigate('/rep/restaurants');
      }
    })();
  }, [
    authLoading,
    repLoading,
    adminLoading,
    user,
    salesRep,
    isSalesRep,
    isAdmin,
    editId,
    navigate,
    searchParams,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
      <div className="flex flex-col items-center gap-3 text-white/70">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <div className="text-sm">{status}</div>
      </div>
    </div>
  );
};

export default RepDemoCreate;
