import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAdminAccess } from './useAdminAccess';

interface SalesRep {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  payout_method: string | null;
  is_active: boolean;
  created_at: string;
}

export const useSalesRep = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [searchParams] = useSearchParams();
  const impersonateRepId = searchParams.get('admin_view_rep');
  const waitingForAdmin = !!impersonateRepId && adminLoading;
  const target = impersonateRepId && isAdmin ? impersonateRepId : null;

  // Share a query across nav, shell and page. Pending auth and transient query
  // failures must never be cached as a confirmed "not a rep" result.
  const role = useQuery({
    queryKey: ['sales-rep', user?.id, target],
    enabled: !!user && !authLoading && !waitingForAdmin,
    queryFn: async (): Promise<SalesRep | null> => {
      const query = supabase.from('sales_reps').select('*');
      const { data, error } = await (target
        ? query.eq('id', target)
        : query.eq('id', user!.id).eq('is_active', true)
      ).maybeSingle();
      if (error) throw error;
      return data as SalesRep | null;
    },
    staleTime: 30_000,
    retry: 2,
  });

  return {
    salesRep: user ? role.data ?? null : null,
    isSalesRep: !!user && !!role.data,
    loading: authLoading || waitingForAdmin || (!!user && role.isPending),
    error: role.error,
    retry: role.refetch,
  };
};
