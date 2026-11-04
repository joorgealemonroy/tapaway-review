import { CanonicalHubReport } from '@/components/analytics/CanonicalHubReport';
interface AdvancedAnalyticsTabProps {
  profileId: string;
  planType: string | null;
  subscriptionStatus?: string | null;
  onUpgrade: () => void;
}

export const AdvancedAnalyticsTab = ({profileId}: AdvancedAnalyticsTabProps) => <CanonicalHubReport key={profileId} hubId={profileId} kind="solo"/>;
