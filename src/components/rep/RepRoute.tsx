import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/** Wait for restored login AND verified roles before mounting portal pages. */
export const RepRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const rep = useSalesRep();
  const admin = useAdminAccess();
  const location = useLocation();

  if (authLoading || rep.loading || admin.loading) {
    return <div className="min-h-screen flex items-center justify-center" role="status">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Restoring your workspace…
    </div>;
  }
  if (!user) {
    const destination = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${destination}`} replace />;
  }
  if (rep.error || admin.error) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">We couldn’t load your workspace</h1>
      <p>You’re still signed in. Check your connection and try again.</p>
      <Button onClick={() => { void rep.retry(); void admin.retry(); }}>Try again</Button>
    </div>;
  }
  if (!rep.isSalesRep) return <Navigate to={admin.isAdmin ? '/admin/reps' : '/'} replace />;
  return <>{children}</>;
};
