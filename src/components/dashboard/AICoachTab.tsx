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

      // Fetch total taps (hub visits only)
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('event_type', 'tap');
      
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

interface Message {
  role: "user" | "assistant";
  content: string;
}

function UnlockedState({ restaurantName, stats }: { restaurantName: string; stats: AiCoachStats }) {
  const { totalTaps, positive, neutral, negative } = stats;
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hola 👋 I'm your TapAway AI Coach. Ask me anything about your reviews, taps, and how to get even more love from your customers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const totalSentiment = positive + neutral + negative || 1;
  const positivePct = Math.round((positive / totalSentiment) * 100);
  const neutralPct = Math.round((neutral / totalSentiment) * 100);
  const negativePct = Math.round((negative / totalSentiment) * 100);

  const sampleLabel = totalTaps <= 1
    ? "your latest tap"
    : `your latest ${Math.min(totalTaps, 250).toLocaleString()} taps`;

  const quickQuestions = [
    "What are my biggest wins this week?",
    "Which dishes are customers loving the most?",
    "When are my best days and hours for happy customers?",
    "How can I get more reviews using TapAway?",
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
          content: "No pasa nada, algo falló al responder. Pero tus datos siguen seguros y TapAway sigue contando tus taps. Intenta otra pregunta en un momento 😊",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              AI Coach Insights
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on {sampleLabel} for{" "}
              <span className="font-medium">{restaurantName}</span>. Ask questions
              and get positive, practical ideas TapAway can help you with.
            </p>
          </div>
        </div>

        {/* QUICK STATS PILL ROW */}
        <div className="flex flex-wrap gap-3 text-xs md:text-sm">
          <StatPill label="Total taps" value={totalTaps.toLocaleString()} />
          <StatPill label="Positive sentiment" value={`${positivePct}%`} />
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: LEFT = POSITIVE INSIGHTS, RIGHT = CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: POSITIVE INSIGHTS & HOW TAPAWAY HELPS */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              What you're doing great 🎉
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="mt-0.5">✅</span>
                <span>
                  Customers are actively engaging with your TapAway cards —
                  every tap is a chance to collect another happy review.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">⭐</span>
                <span>
                  Your positive sentiment is{" "}
                  <span className="font-medium">{positivePct}%</span>. That's a powerful signal new customers see before they ever walk in.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">💬</span>
                <span>
                  You've collected <span className="font-medium">{totalTaps.toLocaleString()} taps</span>. Every single one helps build your reputation and brings you closer to more reviews.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">📈</span>
                <span>
                  TapAway is tracking every tap for you automatically — no extra
                  work, just more data you can turn into better decisions.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-teal-900">
              How TapAway helps you win
            </p>
            <ul className="mt-2 space-y-1 text-xs text-teal-800">
              <li>• Turns table taps into more Google & Yelp reviews.</li>
              <li>• Shows what customers love most about your experience.</li>
              <li>• Keeps all your feedback in one clean dashboard.</li>
              <li>• Helps your team focus on the moves that actually matter.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: AI CHAT */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Ask your AI Coach
          </h3>

          {/* SUGGESTED QUESTIONS */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                className="text-xs rounded-full bg-slate-50 px-3 py-1 border border-slate-200 hover:bg-slate-100 transition"
                onClick={() => handleAsk(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 min-h-[200px] max-h-[340px] overflow-y-auto rounded-xl bg-slate-50 px-3 py-3 mb-4 space-y-3">
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
              handleAsk(input);
            }}
          >
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              placeholder="Ask about your reviews, taps, or how to get more wins with TapAway…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-900">{value}</span>
    </div>
  );
}
