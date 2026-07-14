import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, ExternalLink, Pencil, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';

interface DemoHub {
  id: string;
  restaurant_name: string;
  custom_slug: string | null;
  owner_phone: string | null;
  expires_at: string | null;
  created_at: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const statusFor = (expiresAt: string | null) => {
  if (!expiresAt) return { label: 'Active', color: 'text-emerald-600', expired: false, msLeft: Infinity };
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const msLeft = exp - now;
  if (msLeft <= 0) return { label: 'Expired', color: 'text-red-600 font-semibold', expired: true, msLeft: 0 };
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  const color = daysLeft <= 2 ? 'text-amber-600 font-medium' : 'text-foreground';
  return {
    label: daysLeft === 1 ? '1 day left' : `${daysLeft} days left`,
    color,
    expired: false,
    msLeft,
  };
};

const buildReminderSms = (hub: DemoHub) => {
  const checkoutUrl = `${window.location.origin}/paywall?restaurant=${hub.id}`;
  const body =
    `Hey! Your TapAway custom review hub trial ends in 48 hours. ` +
    `Don't lose your custom page and review cards — tap here to secure your profile ` +
    `and keep collecting reviews: ${checkoutUrl}`;
  const phone = (hub.owner_phone || '').replace(/[^\d+]/g, '');
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
};

const RepRestaurants = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();
  const [hubs, setHubs] = useState<DemoHub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !isSalesRep) navigate('/');
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, restaurant_name, custom_slug, owner_phone, expires_at, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        toast.error('Failed to load demo hubs');
      } else {
        setHubs((data || []) as DemoHub[]);
      }
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rep')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">My Demo Hubs</h1>
            <p className="text-sm text-muted-foreground">{hubs.length} total</p>
          </div>
          <Button onClick={() => navigate('/rep/demo/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Demo Hub
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {hubs.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-card">
            <p className="text-muted-foreground mb-4">No demo hubs yet.</p>
            <Button onClick={() => navigate('/rep/demo/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create your first demo
            </Button>
          </div>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            {/* Header row */}
            <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div>Business</div>
              <div>Created</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            {hubs.map(hub => {
              const status = statusFor(hub.expires_at);
              const showRemind =
                !!hub.owner_phone &&
                hub.expires_at &&
                (status.expired || status.msLeft <= 48 * 60 * 60 * 1000);
              const liveUrl = hub.custom_slug ? `/${hub.custom_slug}` : `/hub/${hub.id}`;

              return (
                <div
                  key={hub.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 md:gap-4 px-4 py-4 border-b last:border-b-0 items-start md:items-center"
                >
                  <div>
                    <p className="font-medium text-foreground">{hub.restaurant_name}</p>
                    {hub.custom_slug && (
                      <p className="text-xs text-muted-foreground truncate">/{hub.custom_slug}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{formatDate(hub.created_at)}</div>
                  <div className={`text-sm ${status.color}`}>{status.label}</div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/rep/demo/${hub.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(liveUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Live
                    </Button>
                    {showRemind && (
                      <a href={buildReminderSms(hub)}>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          <MessageSquareText className="h-3.5 w-3.5 mr-1" /> Remind Owner
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RepRestaurants;
