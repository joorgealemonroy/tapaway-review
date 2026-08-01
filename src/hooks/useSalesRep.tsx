import { useState, useEffect } from 'react';
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
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [searchParams] = useSearchParams();
  const impersonateRepId = searchParams.get('admin_view_rep');

  const [salesRep, setSalesRep] = useState<SalesRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSalesRep, setIsSalesRep] = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    const checkSalesRep = async () => {
      if (!userId) {

        setLoading(false);
        setIsSalesRep(false);
        setSalesRep(null);
        return;
      }

      // Wait for admin check to resolve before deciding whether to impersonate.
      if (impersonateRepId && adminLoading) return;

      try {
        // Admin impersonation: load the targeted rep row instead of caller's own.
        if (impersonateRepId && isAdmin) {
          const { data, error } = await supabase
            .from('sales_reps')
            .select('*')
            .eq('id', impersonateRepId)
            .maybeSingle();

          if (error) {
            console.error('Error loading impersonated rep:', error);
            setIsSalesRep(false);
            setSalesRep(null);
          } else if (data) {
            setSalesRep(data);
            setIsSalesRep(true);
          } else {
            setIsSalesRep(false);
            setSalesRep(null);
          }
          setLoading(false);
          return;
        }

        // Default: caller's own rep row.
        const { data, error } = await supabase
          .from('sales_reps')
          .select('*')
          .eq('id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking sales rep status:', error);
          setIsSalesRep(false);
        } else if (data) {
          setSalesRep(data);
          setIsSalesRep(true);
        } else {
          setIsSalesRep(false);
        }
      } catch (err) {
        console.error('Error in useSalesRep:', err);
        setIsSalesRep(false);
      } finally {
        setLoading(false);
      }
    };

    checkSalesRep();
  }, [user, impersonateRepId, isAdmin, adminLoading]);

  return { salesRep, loading, isSalesRep };
};
