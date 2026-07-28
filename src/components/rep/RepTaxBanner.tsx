import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';

interface RepTaxBannerProps {
  status: 'missing' | 'submitted' | 'approved' | 'rejected';
  repId?: string;
}

const SNOOZE_MS = 24 * 60 * 60 * 1000;

export const RepTaxBanner = ({ status, repId }: RepTaxBannerProps) => {
  const navigate = useRepNavigate();
  const key = `rep_w9_snooze_${repId || 'anon'}`;
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    if (status === 'approved' || status === 'rejected') return;
    try {
      const ts = Number(localStorage.getItem(key) || 0);
      if (ts && Date.now() - ts < SNOOZE_MS) setSnoozed(true);
    } catch {
      // ignore
    }
  }, [key, status]);

  if (status === 'approved') return null;
  if (snoozed && status !== 'rejected') return null;

  const getMessage = () => {
    switch (status) {
      case 'missing':
        return 'Before we can pay out commissions, you need to upload your W-9.';
      case 'submitted':
        return 'Your W-9 is pending review. We\'ll notify you once it\'s approved.';
      case 'rejected':
        return 'Your W-9 was not accepted. Please upload a new one to receive payouts.';
      default:
        return 'Complete your tax information to receive commission payouts.';
    }
  };

  const isRejected = status === 'rejected';
  const container = isRejected
    ? 'bg-red-500/10 border-red-500/20 text-red-200/90'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-200/90';
  const pill = isRejected
    ? 'bg-red-500/20 text-red-100 border-red-400/30'
    : 'bg-amber-500/20 text-amber-100 border-amber-400/30';
  const iconClass = isRejected ? 'text-red-300' : 'text-amber-300';

  const handleSnooze = () => {
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // ignore
    }
    setSnoozed(true);
  };

  return (
    <div className={`border rounded-2xl px-4 py-3 mb-5 ${container} backdrop-blur-md`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
        <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full border ${pill}`}>
            Action needed
          </span>
          <span className="opacity-90">{getMessage()}</span>
          <div className="ml-auto flex items-center gap-2">
            {status !== 'submitted' && (
              <button
                onClick={() => navigate('/rep/profile')}
                className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
              >
                Upload W-9 <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {!isRejected && (
              <button
                onClick={handleSnooze}
                title="Remind me tomorrow"
                className="inline-flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded-md hover:bg-white/5"
              >
                <X className="h-3 w-3" /> Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
