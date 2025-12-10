import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  const [salesRep, setSalesRep] = useState<SalesRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSalesRep, setIsSalesRep] = useState(false);

  useEffect(() => {
    const checkSalesRep = async () => {
      if (!user) {
        setLoading(false);
        setIsSalesRep(false);
        return;
      }

      try {
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
  }, [user]);

  return { salesRep, loading, isSalesRep };
};
