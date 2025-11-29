import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AICoachTabProps {
  restaurantId: string;
  locationId?: string;
}

interface AiCoachStats {
  totalTaps: number;
  totalReviews: number;
  avgRating: number | null;
  positive: number;
  neutral: number;
  negative: number;
  positivePct: number | null;
  neutralPct: number | null;
  negativePct: number | null;
  googleRating: number | null;
  googleUserRatingsTotal: number | null;
  lastGoogleSyncAt: string | null;
  hasGooglePlaceId: boolean;
  latestReviews: {
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string | null;
  }[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AICoachTab = ({ restaurantId }: AICoachTabProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AiCoachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const fetchData = async (forceSync = false) => {
    setLoading(true);
    try {
      // Fetch restaurant info
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('restaurant_name, last_google_sync_at, google_place_id')
        .eq('id', restaurantId)
        .single();
      
      if (restaurantData) {
        setRestaurantName(restaurantData.restaurant_name);

        // Only sync if restaurant has a Google Place ID configured
        if (restaurantData.google_place_id) {
          // Auto-sync if lastGoogleSyncAt is null or > 12 hours old
          const lastSync = restaurantData.last_google_sync_at;
          const shouldAutoSync = !lastSync || 
            (new Date().getTime() - new Date(lastSync).getTime() > 12 * 60 * 60 * 1000);

          if (shouldAutoSync || forceSync) {
            await syncGoogleReviews();
          }
        }
      }

      // Fetch AI insights
      const { data: insightsData, error } = await supabase.functions.invoke('ai-coach-insights', {
        body: { restaurantId }
      });

      if (error) throw error;

      if (insightsData) {
        setStats(insightsData);
      }
    } catch (error) {
      console.error('Error fetching AI coach data:', error);
      toast({
        title: "Error loading insights",
        description: "Could not load AI Coach insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const syncGoogleReviews = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-google-reviews', {
        body: { restaurant_id: restaurantId }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing Google reviews:', error);
      toast({
        title: "Couldn't reach Google",
        description: "Your data is safe — try again in a bit.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshReviews = async () => {
    await syncGoogleReviews();
    await fetchData(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-10 w-64 rounded-xl bg-slate-100 animate-pulse mb-6" />
        <div className="h-32 w-full rounded-2xl bg-slate-100 animate-pulse mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const totalTaps = stats?.totalTaps ?? 0;

  // Check if TapAway account (bypass for admin/owner)
  const isTapAwayOrg = 
    restaurantName.toLowerCase().includes("tapaway") ||
    user?.email === 'tap@tapaway.co';

  const aiCoachLocked = !isTapAwayOrg && totalTaps < 1000;

  // No Google Place ID state
  if (stats && !stats.hasGooglePlaceId) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">AI Coach</h1>
          <p className="text-slate-500 text-sm mt-1">
            Connect your Google profile to unlock AI insights from reviews.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Google Profile Not Connected
          </h2>
          <p className="text-slate-500 max-w-xl text-sm mb-6">
            Connect your Google profile in Settings to unlock AI insights from your reviews.
          </p>
          <button
            type="button"
            className="rounded-xl bg-teal-500 text-white px-6 py-2.5 text-sm font-medium hover:bg-teal-600 transition"
            onClick={() => window.location.href = `/dashboard?tab=settings&restaurantId=${restaurantId}`}
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">AI Coach</h1>
        <p className="text-slate-500 text-sm mt-1">
          Smarter insights based on your Google reviews and customer taps.
        </p>
      </div>

      {aiCoachLocked ? (
        <LockedState totalTaps={totalTaps} />
      ) : stats ? (
        <UnlockedState 
          restaurantName={restaurantName} 
          stats={stats} 
          syncing={syncing}
          onRefresh={handleRefreshReviews}
        />
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
        <Sparkles className="h-4 w-4" />
        <span>{remaining} more taps to unlock</span>
      </button>
    </div>
  );
}

interface UnlockedStateProps {
  restaurantName: string;
  stats: AiCoachStats;
  syncing: boolean;
  onRefresh: () => void;
}

function UnlockedState({ restaurantName, stats, syncing, onRefresh }: UnlockedStateProps) {
  const { totalTaps, totalReviews, avgRating, positivePct, neutralPct, negativePct, positive, neutral, negative, lastGoogleSyncAt } = stats;
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hola 👋 I'm your TapAway AI Coach. Ask me anything about your reviews, taps, and how to get even more love from your customers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const quickQuestions = [
    "What are my biggest wins?",
    "Which dishes are customers loving?",
    "How can I get more reviews using TapAway?",
    "When are my best days for happy customers?",
    "How is TapAway helping my business grow?",
  ];

  const handleAsk = async (question: string) => {
    if (!question.trim() || isSending) return;

    const userMsg: Message = { role: "user", content: question.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          orgName: restaurantName,
          stats,
          messages: nextMessages,
        }
      });

      if (error) throw error;

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply ?? "Here's what I'm seeing: TapAway is driving solid engagement. Keep collecting taps and I'll keep surfacing your wins 🚀",
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("AI Coach error", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "No pasa nada, something went wrong. But your data is safe and TapAway is still counting your taps. Try another question in a moment 😊",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const lastSyncText = lastGoogleSyncAt 
    ? formatDistanceToNow(new Date(lastGoogleSyncAt), { addSuffix: true })
    : "not yet synced";

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                AI Coach Insights
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Based on your latest Google reviews and taps for{" "}
                <span className="font-medium">{restaurantName}</span>. Ask questions
                and get positive, practical ideas TapAway can help you with.
              </p>
            </div>
          </div>

          {/* QUICK STATS & REFRESH */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap gap-2 text-xs md:text-sm">
              <StatPill label="Total taps" value={totalTaps.toLocaleString()} />
              <StatPill label="Total reviews" value={totalReviews.toString()} />
              {avgRating && <StatPill label="Avg rating" value={`${avgRating.toFixed(1)}★`} />}
              {positivePct !== null && <StatPill label="Positive" value={`${positivePct}%`} />}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Last updated: {lastSyncText}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: WIN CARDS */}
        <div className="space-y-6">
          <WinCard stats={stats} restaurantName={restaurantName} />
          <HowTapAwayHelpsCard />
        </div>

        {/* RIGHT: CHAT + SENTIMENT */}
        <div className="space-y-6">
          <ChatCard 
            quickQuestions={quickQuestions}
            messages={messages}
            input={input}
            isSending={isSending}
            onInputChange={setInput}
            onAsk={handleAsk}
          />
          <SentimentCard 
            totalReviews={totalReviews}
            positive={positive}
            neutral={neutral}
            negative={negative}
            positivePct={positivePct}
            neutralPct={neutralPct}
            negativePct={negativePct}
          />
        </div>
      </div>
    </div>
  );
}

function WinCard({ stats, restaurantName }: { stats: AiCoachStats; restaurantName: string }) {
  const { totalTaps, totalReviews, avgRating } = stats;

  return (
    <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-green-900 mb-4 flex items-center gap-2">
        🎉 What you're doing great
      </h3>
      <ul className="space-y-2.5 text-sm text-green-800">
        <li className="flex items-start gap-2">
          <span className="text-green-600 mt-0.5">•</span>
          <span>
            Customers are actively tapping your TapAway cards — <strong>{totalTaps.toLocaleString()} taps</strong> means every interaction is a chance to earn another happy review.
          </span>
        </li>
        {avgRating && (
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">•</span>
            <span>
              Your average Google rating is <strong>{avgRating.toFixed(1)}★</strong>. That's a strong first impression for new customers searching for {restaurantName}.
            </span>
          </li>
        )}
        <li className="flex items-start gap-2">
          <span className="text-green-600 mt-0.5">•</span>
          <span>
            You've collected <strong>{totalReviews} Google {totalReviews === 1 ? 'review' : 'reviews'}</strong>. Each one makes your restaurant more discoverable and trusted.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-600 mt-0.5">•</span>
          <span>
            TapAway is tracking every tap and review automatically — <strong>no extra work</strong>, just better insights for you.
          </span>
        </li>
      </ul>
    </div>
  );
}

function HowTapAwayHelpsCard() {
  return (
    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-teal-900 mb-4">
        How TapAway helps you win
      </h3>
      <ul className="space-y-2 text-sm text-teal-800">
        <li className="flex items-start gap-2">
          <span className="text-teal-600 mt-0.5">•</span>
          <span>Turns table taps into more Google reviews.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-teal-600 mt-0.5">•</span>
          <span>Shows what customers love most about your experience.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-teal-600 mt-0.5">•</span>
          <span>Keeps all your feedback in one clean dashboard.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-teal-600 mt-0.5">•</span>
          <span>Helps your team focus on moves that actually matter (more reviews, better replies, stronger ratings).</span>
        </li>
      </ul>
    </div>
  );
}

interface ChatCardProps {
  quickQuestions: string[];
  messages: Message[];
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onAsk: (question: string) => void;
}

function ChatCard({ quickQuestions, messages, input, isSending, onInputChange, onAsk }: ChatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Ask your AI Coach
      </h3>

      {/* SUGGESTED QUESTIONS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickQuestions.map((q) => (
          <button
            key={q}
            type="button"
            className="text-xs rounded-full bg-slate-50 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 transition"
            onClick={() => onAsk(q)}
            disabled={isSending}
          >
            {q}
          </button>
        ))}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 min-h-[240px] max-h-[360px] overflow-y-auto rounded-xl bg-slate-50 px-3 py-3 mb-4 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={
              m.role === "assistant"
                ? "text-xs text-slate-700 bg-white rounded-lg px-3 py-2 max-w-[95%]"
                : "text-xs text-slate-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 ml-auto max-w-[95%]"
            }
          >
            {m.content}
          </div>
        ))}
        {isSending && (
          <div className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2 inline-block">
            Thinking about the best wins to highlight for you… ✨
          </div>
        )}
      </div>

      {/* INPUT */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAsk(input);
        }}
      >
        <input
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          placeholder="Ask about your reviews, taps, or how to get more wins with TapAway…"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-xl bg-teal-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-teal-600 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}

interface SentimentCardProps {
  totalReviews: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePct: number | null;
  neutralPct: number | null;
  negativePct: number | null;
}

function SentimentCard({ totalReviews, positive, neutral, negative, positivePct, neutralPct, negativePct }: SentimentCardProps) {
  if (totalReviews === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Customer Sentiment from Google Reviews
        </h3>
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            <strong>Waiting for your first Google reviews 👍</strong>
          </p>
          <p className="mt-2">
            You're already getting taps. As soon as reviews start coming in, I'll break down what customers love most.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Customer Sentiment from Google Reviews
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Most of your guests are having a great experience — here's how that looks based on <strong>{totalReviews}</strong> Google {totalReviews === 1 ? 'review' : 'reviews'}:
      </p>
      <div className="space-y-3">
        {positivePct !== null && positive > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Positive (≥4★)
              </span>
              <span className="font-medium">{positive} ({positivePct}%)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${positivePct}%` }} />
            </div>
          </div>
        )}
        {neutralPct !== null && neutral > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Neutral (3★)
              </span>
              <span className="font-medium">{neutral} ({neutralPct}%)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${neutralPct}%` }} />
            </div>
          </div>
        )}
        {negativePct !== null && negative > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Negative (≤2★)
              </span>
              <span className="font-medium">{negative} ({negativePct}%)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${negativePct}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
      <span className="text-[11px] text-slate-500">{label}:</span>
      <span className="text-xs font-medium text-slate-900">{value}</span>
    </div>
  );
}
