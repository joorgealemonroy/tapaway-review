import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { setAnalyticsActor } from '@/lib/analytics';

/** Reports never grant roles. This resolves staff classification before events leave the tab. */
export function useAnalyticsActor() {
  const { user, loading } = useAuth();
  const role = useQuery({queryKey:['analytics-staff',user?.id],enabled:!!user&&!loading,queryFn:async()=>{
    const {data,error}=await supabase.from('user_roles').select('role').eq('user_id',user?.id ?? '');
    if(error)throw error;
    return data.some(r=>['admin','sales_rep'].includes(r.role));
  },staleTime:60000,retry:1});
  const ready = !loading && (!user || role.isSuccess);
  const internal = role.data===true;
  useEffect(()=>{setAnalyticsActor(ready,internal);},[ready,internal]);
  return {ready,internal};
}