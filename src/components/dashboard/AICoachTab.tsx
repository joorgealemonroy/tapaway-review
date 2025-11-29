import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AICoachTabProps {
  restaurantId: string;
  locationId?: string;
}

interface AiCoachStats {
  totalTaps: number;
  positive: number;
  neutral: number;
  negative: number;
  topItems: string[];
  recommendations: string[];
}

export const AICoachTab = ({ restaurantId, locationId }: AICoachTabProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AiCoachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [restaurantId, locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch restaurant info
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('restaurant_name')
        .eq('id', restaurantId)
        .single();
      
      if (restaurantData) {
        setRestaurantName(restaurantData.restaurant_name);
      }

      // Fetch total taps
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);
      
      const totalTaps = count || 0;

      // Fetch AI insights
      const { data: insightsData, error } = await supabase.functions.invoke('ai-coach-insights', {
        body: { restaurantId, locationId }
      });

      if (error) throw error;

      // Map existing data structure to new format
      const scores = insightsData.scores || { health: 0, staffEngagement: 0, reviewQuality: 0, activity: 0 };
      const insights = insightsData.insights || [];

      // Derive sentiment from review quality score (simple mapping)
      const reviewQuality = scores.reviewQuality || 50;
      const positive = Math.round((reviewQuality / 100) * totalTaps * 0.6);
      const neutral = Math.round((reviewQuality / 100) * totalTaps * 0.3);
      const negative = totalTaps - positive - neutral;

      // Split insights into opportunities and recommendations
      const topItems = insights
        .filter((i: any) => i.type === 'warning')
        .map((i: any) => i.title)
        .slice(0, 3);
      
      const recommendations = insights
        .filter((i: any) => i.type === 'success' || i.type === 'info')
        .map((i: any) => i.title)
        .slice(0, 3);

      setStats({
        totalTaps,
        positive,
        neutral,
        negative,
        topItems,
        recommendations
      });
    } catch (error) {
      console.error('Error fetching AI coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-10 w-64 rounded-xl bg-slate-100 animate-pulse mb-6" />
        <div className="h-32 w-full rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const totalTaps = stats?.totalTaps ?? 0;

  // Check if TapAway account (bypass for admin/owner)
  const isTapAwayOrg = 
    restaurantName.toLowerCase().includes("tapaway") ||
    user?.email === 'tap@tapaway.co';

  const aiCoachLocked = !isTapAwayOrg && totalTaps < 1000;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">AI Coach</h1>
        <p className="text-slate-500 text-sm mt-1">
          Smarter insights based on your customer reviews and taps.
        </p>
      </div>

      {aiCoachLocked ? (
        <LockedState totalTaps={totalTaps} />
      ) : stats ? (
        <UnlockedState restaurantName={restaurantName} stats={stats} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Unable to Load Insights
          </h2>
          <p className="text-slate-500 max-w-xl text-sm">
            We couldn't load AI Coach insights for this restaurant. Please try again later.
          </p>
        </div>
      )}
    </div>
  );
};

function LockedState({ totalTaps }: { totalTaps: number }) {
  const target = 1000;
  const remaining = Math.max(target - totalTaps, 0);
  const progress = Math.min((totalTaps / target) * 100, 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center mb-4">
        <span className="text-2xl">🔒</span>
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        AI Coach Locked
      </h2>
      <p className="text-slate-500 max-w-xl mb-8 text-sm">
        AI Coach unlocks after <span className="font-medium">1,000 taps</span>{" "}
        so we have enough data to give you real insights.
      </p>

      <div className="w-full max-w-md mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{totalTaps} taps</span>
          <span>1,000 taps</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-2.5 bg-teal-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-400/10 text-teal-600 px-5 py-2 text-sm font-medium"
      >
        <span>✨ {remaining} more taps to unlock</span>
      </button>
    </div>
  );
}

function UnlockedState({ restaurantName, stats }: { restaurantName: string; stats: AiCoachStats }) {
  const { totalTaps, positive, neutral, negative, topItems, recommendations } = stats;

  const totalSentiment = positive + neutral + negative || 1;
  const positivePct = Math.round((positive / totalSentiment) * 100);
  const neutralPct = Math.round((neutral / totalSentiment) * 100);
  const negativePct = Math.round((negative / totalSentiment) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              AI Coach Insights
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on your latest {totalTaps.toLocaleString()}+ taps for{" "}
              <span className="font-medium">{restaurantName}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Top Opportunities
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {topItems && topItems.length > 0 ? (
              topItems.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5">📌</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex gap-2">
                  <span className="mt-0.5">📌</span>
                  <span>
                    Customers consistently praise your most popular dishes — highlight them on your menu and social media.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">⏱️</span>
                  <span>
                    Wait times feel long during peak hours. Consider more staff or simplified rush-hour menu items.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">😊</span>
                  <span>
                    Staff friendliness is a major driver of 5-star reviews. Keep recognizing top performers.
                  </span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Customer Sentiment
          </h3>
          <p className="text-3xl font-semibold text-slate-900 mb-1">
            {positivePct}% <span className="text-base font-normal">positive</span>
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Based on your latest {totalTaps.toLocaleString()} taps.
          </p>

          <div className="space-y-2">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-400"
                style={{ width: `${positivePct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>🙂 {positivePct}%</span>
              <span>😐 {neutralPct}%</span>
              <span>🙁 {negativePct}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Recommended Actions
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {recommendations && recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5">➡️</span>
                  <span>{rec}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex gap-2">
                  <span className="mt-0.5">➡️</span>
                  <span>
                    Promote your best-reviewed plates with in-store signage and stories.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">➡️</span>
                  <span>
                    Run a weekly staff challenge tied to number of 5-star reviews.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">➡️</span>
                  <span>
                    Train hosts and servers to remind happy tables to tap the card before leaving.
                  </span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 flex items-start gap-3">
        <div className="mt-1">🔄</div>
        <div>
          <p className="text-sm font-medium text-teal-900">
            AI Coach keeps learning.
          </p>
          <p className="text-xs text-teal-800 mt-1">
            Every new tap updates your insights automatically. Keep driving reviews to unlock even deeper recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
