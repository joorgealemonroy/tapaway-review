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

type RepResult = { rep: SalesRep | null };

// Module-level caches so that multiple components mounting this hook at the same
// time (nav + shell + page) share a single network request instead of firing
// identical `sales_reps` queries three times per page load.
const repCache = new Map<string, RepResult>();
const inFlight = new Map<string, Promise<RepResult>>();

export const clearSalesRepCache = () => {
  repCache.clear();
  inFlight.clear();
};

const fetchRep = async (key: string, userId: string, impersonateRepId: string | null): Promise<RepResult> => {
  const cached = repCache.get(key);
  if (cached) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<RepResult> => {
    if (impersonateRepId) {
      const { data, error } = await supabase
        .from('sales_reps')
        .select('*')
        .eq('id', impersonateRepId)
        .maybeSingle();
      if (error) {
        console.error('Error loading impersonated rep:', error);
        return { rep: null };
      }
      return { rep: (data as SalesRep) ?? null };
    }

    const { data, error } = await supabase
      .from('sales_reps')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      console.error('Error checking sales rep status:', error);
      return { rep: null };
    }
    return { rep: (data as SalesRep) ?? null };
  })();

  inFlight.set(key, promise);
  try {
    const result = await promise;
    repCache.set(key, result);
    return result;
  } finally {
    inFlight.delete(key);
  }
};

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
    let cancelled = false;

    const run = async () => {
      if (!userId) {
        clearSalesRepCache();
        setLoading(false);
        setIsSalesRep(false);
        setSalesRep(null);
        return;
      }

      // Wait for admin check to resolve before deciding whether to impersonate.
      if (impersonateRepId && adminLoading) return;

      const target = impersonateRepId && isAdmin ? impersonateRepId : null;
      const key = `${userId}|${target ?? 'self'}`;

      try {
        const { rep } = await fetchRep(key, userId, target);
        if (cancelled) return;
        setSalesRep(rep);
        setIsSalesRep(!!rep);
      } catch (err) {
        console.error('Error in useSalesRep:', err);
        if (!cancelled) {
          setSalesRep(null);
          setIsSalesRep(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userId, impersonateRepId, isAdmin, adminLoading]);

  return { salesRep, loading, isSalesRep };
};
