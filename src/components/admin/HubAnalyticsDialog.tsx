import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CanonicalHubReport } from '@/components/analytics/CanonicalHubReport';
export type HubAnalyticsTarget = {
  id: string;
  kind: "legacy" | "lite";
  name: string;
  slug: string | null;
  photo_url: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

type Props = {
  target: HubAnalyticsTarget | null;
  onClose: () => void;
};

const HubAnalyticsDialog = ({target,onClose}: Props) => <Dialog open={!!target} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto bg-background text-foreground"><DialogHeader><DialogTitle>Private hub activity</DialogTitle></DialogHeader>{target && <CanonicalHubReport key={`${target.kind}:${target.id}`} hubId={target.id} kind={target.kind==='lite'?'solo':'business'}/>}</DialogContent></Dialog>;
export default HubAnalyticsDialog;
