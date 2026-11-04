import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CanonicalHubReport } from '@/components/analytics/CanonicalHubReport';
export interface AnalyticsOverviewProps {
  restaurantId: string;
  restaurantName: string;
  restaurant: {
    greeting_name?: string | null;
    restaurant_name: string;
  };
  user: unknown;
  isDemoView?: boolean;
  /** Deep-links the empty-state CTA buttons to the right dashboard tab. */
  onNavigateTab?: (tab: "settings" | "menu") => void;
  /** Used by the empty-state CTA to link the live hub. */
  customSlug?: string | null;
}

export const AnalyticsOverview = ({restaurantId}: AnalyticsOverviewProps) => {
 const reviews=useQuery({queryKey:['independent-google-reviews',restaurantId],queryFn:async()=>{
  const {data,error}=await supabase.from('google_review_snapshots').select('review_count,captured_at').eq('restaurant_id',restaurantId).order('captured_at',{ascending:false}).limit(1);
  if(error)throw error;return data?.[0] ?? null;
 },retry:1});
 return <div className="space-y-6"><CanonicalHubReport key={restaurantId} hubId={restaurantId} kind="business"/>{reviews.data && <section className="border-t border-border pt-4"><h3 className="font-semibold">Google review evidence · independent of hub clicks</h3><p>{reviews.data.review_count} reviews on Google · snapshot {reviews.data.captured_at}</p><p className="text-xs text-muted-foreground">Google counts do not establish that a hub view or click caused a review.</p></section>}{reviews.isError && <p role="status">Google review evidence is unavailable; hub activity is reported independently.</p>}</div>;
};
